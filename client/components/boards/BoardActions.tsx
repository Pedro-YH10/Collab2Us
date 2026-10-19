import { useState } from "react";
import type { Board, BoardsResponse } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n-context";
import { toast } from "sonner";
import { ExternalLink, Settings, LayoutTemplate, Sparkles } from "lucide-react";

export function BoardActions({ 
  board, 
  onUpdated, 
  onDeleted, 
  trelloBoards, 
}: { 
  board: Board; 
  onUpdated: () => void; 
  onDeleted: () => void; 
  trelloBoards?: BoardsResponse["boards"];
  onInstantiate?: (id: string) => void;
}) {
  const { t, language } = useTranslation();
  const [managerOpen, setManagerOpen] = useState(false);
  const [name, setName] = useState(board.name);
  const [convOpen, setConvOpen] = useState(false);
  const [targetBoard, setTargetBoard] = useState<string>("");

  const [selectedTemplate, setSelectedTemplate] = useState<"canvas" | "usm" | "discovery">("canvas");
  const [aiConceptPrompt, setAiConceptPrompt] = useState("");
  const [generatingIdeas, setGeneratingIdeas] = useState(false);

  const base = board.source === "miro" ? "/api/miro/boards" : "/api/trello/boards";
  const renameDisabled = name.trim().length === 0 || name === board.name;

  async function handleRename() {
    try {
      const res = await fetch(`${base}/${board.id}`, { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ name }) 
      });
      if (res.ok) {
        toast.success(t("toast_board_rename_success"));
        onUpdated();
        setManagerOpen(false);
      }
    } catch {
      toast.error(t("toast_board_rename_error"));
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`${base}/${board.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("toast_board_delete_success"));
        setManagerOpen(false);
        onDeleted();
      }
    } catch {
      toast.error(t("toast_board_delete_error"));
    }
  }

  async function handleInstantiateStructuredTemplate() {
    try {
      const res = await fetch(`/api/miro/boards/${board.id}/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          templateType: selectedTemplate,
          language
        }),
        credentials: "include"
      });

      if (res.ok) {
        toast.success(t("toast_template_success"));
        setManagerOpen(false);
      }
    } catch {
      toast.error(t("toast_server_comm_error"));
    }
  }

  async function handleGenerateAIIdeas() {
    if (!aiConceptPrompt.trim()) return;
    setGeneratingIdeas(true);
    try {
      const res = await fetch("/api/ai/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept: aiConceptPrompt, miroBoardId: board.id, language }),
        credentials: "include"
      });

      if (res.ok) {
        toast.success(t("toast_ai_ideas_success"));
        setAiConceptPrompt("");
        setManagerOpen(false);
      }
    } catch {
      toast.error(t("toast_ai_ideas_error"));
    } finally {
      setGeneratingIdeas(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog open={managerOpen} onOpenChange={setManagerOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
            <Settings className="h-3 w-3" /> {t("boards_manage_btn")}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("boards_manage_title")} ({board.source === "miro" ? "Miro" : "Trello"})</DialogTitle>
            <DialogDescription>{t("boards_manage_desc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2 border rounded-lg p-3 bg-card">
              <Label htmlFor="b-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("boards_name_label")}</Label>
              <div className="flex gap-2">
                <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
                <Button size="sm" className="h-9 text-xs" onClick={handleRename} disabled={renameDisabled}>{t("boards_save")}</Button>
              </div>
            </div>

            {board.source === "miro" && (
              <>
                <div className="border rounded-lg p-3 space-y-2 bg-accent/5">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <LayoutTemplate className="h-4 w-4 text-primary" /> {t("boards_templates_title")}
                  </p>
                  <Select value={selectedTemplate} onValueChange={(v: any) => setSelectedTemplate(v)}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="canvas" className="text-xs">
                        {language === "pt" ? "Canvas de Histórias (Connextra)" : language === "es" ? "Canvas de Historias (Connextra)" : "User Story Canvas (Connextra)"}
                      </SelectItem>
                      <SelectItem value="usm" className="text-xs">
                        {language === "pt" ? "Mapeamento de Histórias (Jornada + Sprints)" : language === "es" ? "Mapeo de Historias (Jornada + Sprints)" : "User Story Mapping (Journey + Sprints)"}
                      </SelectItem>
                      <SelectItem value="discovery" className="text-xs">
                        {language === "pt" ? "Zona de Descoberta (Lean Inception)" : language === "es" ? "Zona de Descubrimiento (Lean Inception)" : "Discovery Zone (Lean Inception)"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="w-full gap-1 text-xs h-8" onClick={handleInstantiateStructuredTemplate}>
                    {t("boards_apply_template")}
                  </Button>
                </div>

                <div className="border border-primary/20 rounded-lg p-3 space-y-2 bg-primary/5">
                  <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> {t("boards_ai_ideation_title")}
                  </p>
                  <Input 
                    placeholder={t("boards_ai_ideation_placeholder")} 
                    value={aiConceptPrompt} 
                    onChange={(e) => setAiConceptPrompt(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                  <Button 
                    size="sm" 
                    className="w-full gap-1 text-xs h-8" 
                    onClick={handleGenerateAIIdeas}
                    disabled={generatingIdeas || !aiConceptPrompt.trim()}
                  >
                    {generatingIdeas ? t("boards_ai_generating") : t("boards_ai_ideation_btn")}
                  </Button>
                </div>
              </>
            )}

            <Button variant="secondary" size="sm" className="w-full gap-1.5 h-9 text-xs" onClick={() => window.open(board.url, "_blank")}>
              <ExternalLink className="h-3.5 w-3.5" /> {t("boards_open_official")}
            </Button>

            <div className="border border-destructive/20 rounded-lg p-3 space-y-2 bg-destructive/5">
              <Button variant="destructive" size="sm" className="w-full gap-1 h-8 text-xs" onClick={handleDelete}>
                {t("boards_delete_board")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {board.source === "miro" && (
        <Dialog open={convOpen} onOpenChange={setConvOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs">{t("boards_sync_btn")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("boards_sync_dialog_title")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="target-b">{t("boards_sync_target_label")}</Label>
              <Select value={targetBoard} onValueChange={setTargetBoard}>
                <SelectTrigger id="target-b"><SelectValue placeholder={t("boards_sync_target_placeholder")} /></SelectTrigger>
                <SelectContent>
                  {trelloBoards?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConvOpen(false)}>{t("cancel")}</Button>
              <a href={targetBoard ? `/stories?miroBoardId=${board.id}&trelloBoardId=${targetBoard}` : undefined}>
                <Button disabled={!targetBoard}>{t("boards_sync_next_step")}</Button>
              </a>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}