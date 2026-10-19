import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Board, BoardsResponse } from "@shared/api";
import { Button } from "@/components/ui/button";
import { BoardActions } from "@/components/boards/BoardActions";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n-context";
import { toast } from "sonner";
import { Layers, Activity, FolderKanban, Sparkles, Search, Plus } from "lucide-react";
import { Link } from "react-router-dom";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Error fetching data");
  return res.json();
}

export default function Boards() {
  const qc = useQueryClient();
  const { t, language } = useTranslation();

  // Estados de busca individuais
  const [queryTrello, setQueryTrello] = useState("");
  const [queryMiro, setQueryMiro] = useState("");

  // Modais e carregamento para criação de quadros
  const [trelloModalOpen, setTrelloModalOpen] = useState(false);
  const [trelloBoardName, setTrelloBoardName] = useState("");
  const [creatingTrello, setCreatingTrello] = useState(false);

  const [miroModalOpen, setMiroModalOpen] = useState(false);
  const [miroBoardName, setMiroBoardName] = useState("");
  const [miroTemplateType, setMiroTemplateType] = useState<"canvas" | "usm" | "discovery">("canvas");
  const [creatingMiro, setCreatingMiro] = useState(false);

  const miro = useQuery({ 
    queryKey: ["miro-boards"], 
    queryFn: () => fetchJSON<BoardsResponse>("/api/miro/boards") 
  });
  
  const trello = useQuery({ 
    queryKey: ["trello-boards"], 
    queryFn: () => fetchJSON<BoardsResponse>("/api/trello/boards") 
  });

  function refetchAll() {
    qc.invalidateQueries({ queryKey: ["miro-boards"] });
    qc.invalidateQueries({ queryKey: ["trello-boards"] });
  }

  // Filtragem independente para o Trello
  const trelloBoards = useMemo(() => {
    const q = queryTrello.trim().toLowerCase();
    const filtered = (trello.data?.boards || []).filter((b) => (q ? b.name.toLowerCase().includes(q) : true));
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [trello.data, queryTrello]);

  // Filtragem independente para o Miro
  const miroBoards = useMemo(() => {
    const q = queryMiro.trim().toLowerCase();
    const filtered = (miro.data?.boards || []).filter((b) => (q ? b.name.toLowerCase().includes(q) : true));
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [miro.data, queryMiro]);

  // Criação remota de quadro no Trello
  async function handleCreateTrello() {
    if (!trelloBoardName.trim()) return;
    setCreatingTrello(true);
    try {
      const res = await fetch("/api/trello/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trelloBoardName.trim() }),
        credentials: "include"
      });
      if (res.ok) {
        toast.success(t("toast_template_success"));
        setTrelloModalOpen(false);
        setTrelloBoardName("");
        refetchAll();
      } else {
        toast.error(t("toast_server_comm_error"));
      }
    } catch {
      toast.error(t("toast_server_comm_error"));
    } finally {
      setCreatingTrello(false);
    }
  }

  // Criação remota de quadro no Miro com template estruturado
  async function handleCreateMiro() {
    if (!miroBoardName.trim()) return;
    setCreatingMiro(true);
    try {
      const res = await fetch("/api/miro/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: miroBoardName.trim(), 
          templateType: miroTemplateType, 
          language 
        }),
        credentials: "include"
      });
      if (res.ok) {
        toast.success(t("toast_template_success"));
        setMiroModalOpen(false);
        setMiroBoardName("");
        refetchAll();
      } else {
        toast.error(t("toast_server_comm_error"));
      }
    } catch {
      toast.error(t("toast_server_comm_error"));
    } finally {
      setCreatingMiro(false);
    }
  }

  async function handleInstantiateTemplate(boardId: string) {
    try {
      const res = await fetch(`/api/miro/boards/${boardId}/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateType: "canvas", language }),
        credentials: "include"
      });
      if (res.ok) {
        toast.success(t("toast_template_success"));
      }
    } catch {
      toast.error(t("toast_server_comm_error"));
    }
  }

  const totalConnected = (miro.data?.boards?.length || 0) + (trello.data?.boards?.length || 0);

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("boards_title")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t("boards_subtitle")}</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Link to="/settings"><Button variant="outline" size="sm" className="h-9">{t("nav_settings")}</Button></Link>
          <Button size="sm" onClick={refetchAll} className="h-9">{t("boards_refresh")}</Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <Layers className="h-5 w-5 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("boards_total_connected")}</p>
              <p className="text-lg font-bold">{totalConnected}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-cyan-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("boards_miro_active")}</p>
              <p className="text-lg font-bold">{miro.data?.boards?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <FolderKanban className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("boards_trello_active")}</p>
              <p className="text-lg font-bold">{trello.data?.boards?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid Principal: Miro e Trello */}
      <div className="grid gap-6 md:grid-cols-2 items-start">
        
        {/* MIRO */}
        <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm tracking-tight">{t("boards_miro_section")}</h2>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-medium text-muted-foreground">
                {miroBoards.length}
              </span>
            </div>

            {/* Diálogo de Criação de Quadro no Miro */}
            <Dialog open={miroModalOpen} onOpenChange={setMiroModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("boards_create_miro_btn")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm">{t("boards_create_miro_title")}</DialogTitle>
                  <DialogDescription className="text-xs">{t("boards_create_miro_desc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 my-2">
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground uppercase font-bold">{t("boards_name_label")}</Label>
                    <Input 
                      value={miroBoardName} 
                      onChange={(e) => setMiroBoardName(e.target.value)} 
                      placeholder={t("boards_create_miro_placeholder")} 
                      className="h-8 text-xs" 
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground uppercase font-bold">{t("boards_templates_title")}</Label>
                    <Select value={miroTemplateType} onValueChange={(v: any) => setMiroTemplateType(v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="canvas" className="text-xs">{t("boards_template_canvas")}</SelectItem>
                        <SelectItem value="usm" className="text-xs">{t("boards_template_usm")}</SelectItem>
                        <SelectItem value="discovery" className="text-xs">{t("boards_template_discovery")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button size="sm" variant="outline" onClick={() => setMiroModalOpen(false)}>{t("cancel")}</Button>
                  <Button size="sm" onClick={handleCreateMiro} disabled={creatingMiro || !miroBoardName.trim()}>
                    {creatingMiro ? t("boards_creating") : t("boards_save")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Barra de Busca do Miro */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("boards_search_miro")}
              value={queryMiro}
              onChange={(e) => setQueryMiro(e.target.value)}
              className="h-8 text-xs pl-8 bg-background"
            />
          </div>

          {/* Lista de Quadros Miro */}
          <BoardList
            boards={miroBoards}
            loading={miro.isLoading}
            error={miro.isError}
            onUpdated={refetchAll}
            onDeleted={refetchAll}
            onInstantiate={handleInstantiateTemplate}
            trelloBoards={trello.data?.boards}
          />
        </div>

        {/* TRELLO */}
        <div className="rounded-lg border bg-card p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm tracking-tight">{t("boards_trello_section")}</h2>
              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-medium text-muted-foreground">
                {trelloBoards.length}
              </span>
            </div>

            {/* Diálogo de Criação de Quadro no Trello */}
            <Dialog open={trelloModalOpen} onOpenChange={setTrelloModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("boards_create_trello_btn")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-sm">{t("boards_create_trello_title")}</DialogTitle>
                  <DialogDescription className="text-xs">{t("boards_create_trello_desc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 my-2">
                  <Label className="text-xs text-muted-foreground uppercase font-bold">{t("boards_name_label")}</Label>
                  <Input 
                    value={trelloBoardName} 
                    onChange={(e) => setTrelloBoardName(e.target.value)} 
                    placeholder={t("boards_create_trello_placeholder")} 
                    className="h-8 text-xs" 
                  />
                </div>
                <DialogFooter>
                  <Button size="sm" variant="outline" onClick={() => setTrelloModalOpen(false)}>{t("cancel")}</Button>
                  <Button size="sm" onClick={handleCreateTrello} disabled={creatingTrello || !trelloBoardName.trim()}>
                    {creatingTrello ? t("boards_creating") : t("boards_save")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Barra de Busca do Trello */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("boards_search_trello")}
              value={queryTrello}
              onChange={(e) => setQueryTrello(e.target.value)}
              className="h-8 text-xs pl-8 bg-background"
            />
          </div>

          {/* Lista de Quadros Trello */}
          <BoardList
            boards={trelloBoards}
            loading={trello.isLoading}
            error={trello.isError}
            onUpdated={refetchAll}
            onDeleted={refetchAll}
          />
        </div>

      </div>
    </div>
  );
}

function BoardList({ 
  boards,
  loading, 
  error, 
  onUpdated, 
  onDeleted, 
  onInstantiate, 
  trelloBoards 
}: { 
  boards?: Board[]; 
  loading: boolean; 
  error: boolean; 
  onUpdated: () => void; 
  onDeleted: () => void; 
  onInstantiate?: (id: string) => void; 
  trelloBoards?: Board[];
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-12 w-full rounded" />
        <Skeleton className="h-12 w-full rounded" />
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive text-xs py-2">{t("boards_error_load")}</p>;
  }

  if (boards && boards.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-6">{t("boards_empty")}</p>;
  }

  return (
    <div className="grid gap-2 max-h-[500px] overflow-y-auto pr-1">
      {boards?.map((b) => (
        <div key={b.id} className="group rounded-md border p-3 hover:border-primary/40 hover:bg-accent/5 transition-all bg-background">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="block truncate cursor-pointer" onClick={() => window.open(b.url, "_blank")}>
                <p className="font-semibold text-xs group-hover:text-primary truncate">{b.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">ID: {b.id}</p>
              </span>
            </div>
            <BoardActions 
              board={b} 
              onUpdated={onUpdated} 
              onDeleted={onDeleted} 
              trelloBoards={trelloBoards} 
              onInstantiate={onInstantiate}
            />
          </div>
        </div>
      ))}
    </div>
  );
}