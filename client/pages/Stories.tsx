import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Board, BoardsResponse, ConvertRequest, ConvertResponse } from "@shared/api";
import { useAuth } from "@/lib/auth-context";
import { useLocation, useSearchParams } from "react-router-dom";

//Formatação de uma história de usuário:
interface FormattedStory {
  id: string;
  title: string;
  desc: string;
  labels: string[];
}

//Página Histórias:
export default function Stories() {
  const { user } = useAuth();
  const userId = user?.id;

  const [searchParams] = useSearchParams();
  const initialMiroBoardId = searchParams.get("miroBoardId") || "";
  const initialTrelloBoardId = searchParams.get("trelloBoardId") || "";

  const [miroId, setMiroId] = useState(initialMiroBoardId);
  const [trelloId, setTrelloId] = useState(initialTrelloBoardId);
  const [trelloListName, setTrelloListName] = useState("");
  const [listStrategy, setListStrategy] = useState<ConvertRequest["listStrategy"]>("first");
  const [template, setTemplate] = useState<"userStory" | "raw">("userStory");
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<{ score: number; suggestions: string[]; criteria: number } | null>(null);
  const [miroBoards, setMiroBoards] = useState<Board[]>([]);
  const [trelloBoards, setTrelloBoards] = useState<Board[]>([]);
  const [trelloLists, setTrelloLists] = useState<{ id: string; name: string }[]>([]);
  const [formattedMiroStories, setFormattedMiroStories] = useState<FormattedStory[]>([]);

  //Carregar quadros:
  useEffect(() => {
    (async () => {
      if (!userId) return;
      try {
        const [miro, trello] = await Promise.all([
          fetch(`/api/miro/boards`, { headers: { "X-User-Id": userId } }).then(res => res.json()),
          fetch(`/api/trello/boards`, { headers: { "X-User-Id": userId } }).then(res => res.json()),
        ]);
        setMiroBoards(miro.boards);
        setTrelloBoards(trello.boards);
      } catch (e) { /* ignore */ }
    })();
  }, [userId]);

  //Carregar listas do Trello:
  useEffect(() => {
    (async () => {
      if (!trelloId || !userId) { setTrelloLists([]); return; }
      const res = await fetch(`/api/trello/lists?boardId=${encodeURIComponent(trelloId)}`, { headers: { "X-User-Id": userId } });
      if (res.ok) {
        const data = await res.json();
        setTrelloLists(data.lists || []);
      }
    })();
  }, [trelloId, userId]);

  //Carregar pré visualização de histórias de usuário:
  useEffect(() => {
    (async () => {
      if (!miroId || !userId) { setFormattedMiroStories([]); return; }
      try {
        const res = await fetch(`/api/stories/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Id": userId },
          body: JSON.stringify({ miroBoardId: miroId, template }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setFormattedMiroStories(data.stories || []);
      } catch (e: any) {
        console.error("Erro ao carregar pré-visualização do Miro:", e);
        toast.error(e.message || "Falha ao carregar pré-visualização");
        setFormattedMiroStories([]);
      }
    })();
  }, [miroId, template, userId]);

  //Armazenamento na memória:
  const tagStats = useMemo(() => {
    const m = new Map<string, number>();
    for (const story of formattedMiroStories) {
      if (story.labels && story.labels.length > 0) {
        const tag = story.labels[0];
        m.set(tag, (m.get(tag) || 0) + 1);
      } else {
        m.set("Sem Tag", (m.get("Sem Tag") || 0) + 1);
      }
    }
    return Array.from(m.entries()).map(([name, count]) => ({ name, count }));
  }, [formattedMiroStories]);

  //Função de converter histórias de usuário do Miro pro Trello:
  async function convert() {
    setLoading(true);
    try {
      const body: ConvertRequest = { miroBoardId: miroId, trelloBoardId: trelloId, listStrategy, template };
      if (listStrategy === "byName") body.listName = trelloListName;

      const res = await fetch("/api/convert/miro-to-trello", { method: "POST", headers: { "Content-Type": "application/json", ...(userId ? { "X-User-Id": userId } : {}) }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ConvertResponse;
      toast.success(`Criados ${data.createdCards} cartões no Trello`);
    } catch (e: any) {
      toast.error(e.message || "Falha na conversão");
    } finally {
      setLoading(false);
    }
  }

  //Função de analisar história de usuário:
  async function analyze() {
    try {
      const res = await fetch("/api/stories/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok) throw new Error("Falha ao analisar");
      const data = await res.json();
      setAnalysis(data);
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold tracking-tight">Histórias de Usuário</h1>
      <p className="text-muted-foreground">Converta post-its do Miro em cartões no Trello e aprimore a qualidade das histórias</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/*
        <div className="rounded-xl border bg-card p-6 grid gap-4 flex flex-col">
        */}
        <div className="rounded-xl bg-card p-6 gap-4 flex flex-col">
          <div className="grid gap-2">
            <Label>Selecionar quadro Miro</Label>
            <Select value={miroId} onValueChange={setMiroId}>
              <SelectTrigger><SelectValue placeholder="Escolha um quadro" /></SelectTrigger>
              <SelectContent>
                {miroBoards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Selecionar quadro Trello</Label>
            <Select value={trelloId} onValueChange={setTrelloId}>
              <SelectTrigger><SelectValue placeholder="Escolha um quadro" /></SelectTrigger>
              <SelectContent>
                {trelloBoards.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="grid gap-1">
              <Label>Estrategia de lista</Label>
              <Select value={listStrategy} onValueChange={(v) => setListStrategy(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">Primeira lista</SelectItem>
                  <SelectItem value="byName">Por nome</SelectItem>
                  <SelectItem value="byTag">Por tag (cria listas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <Label>Nome da lista (quando "Por nome")</Label>
              <Input placeholder="ex: Backlog" value={trelloListName} onChange={(e) => setTrelloListName(e.target.value)} disabled={listStrategy !== "byName"} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Template</Label>
            <Select value={template} onValueChange={(v) => setTemplate(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="userStory">História de usuário</SelectItem>
                <SelectItem value="raw">Somente texto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={convert} disabled={loading || !miroId || !trelloId}>{loading ? "Convertendo..." : "Converter para Trello"}</Button>

          {listStrategy === "byTag" && tagStats.length > 0 && (
            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Planejamento de listas por tag</p>
              <ul className="mt-2 grid gap-1">
                {tagStats.map((t) => <li key={t.name}>{t.name}: {t.count} notas</li>)}
              </ul>
            </div>
          )}
        </div>



        <div className="rounded-xl border bg-card p-6 gap-4 flex flex-col"> {/* Adicionado flex flex-col */}
          <div>
            <Label htmlFor="story">Analisar história</Label>
            <Textarea id="story" rows={6} placeholder="Como [papel], quero [objetivo], para [benefício]" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={analyze}>Analisar</Button>
            {/*
            <Button variant="secondary" onClick={() => setText((t) => `${t}\n\nCritérios de aceitação:\n- `)}>Gerar critérios</Button>
            */}
          </div>
          {analysis && (
            <div className="rounded-md border p-3 text-sm">
              <p><span className="font-semibold">Qualidade:</span> {analysis.score}/100</p>
              {/*
              <p><span className="font-semibold">Sugestões:</span> {analysis.suggestions}</p>
              */}
              {analysis.suggestions.length > 0 && (
                <ul className="mt-2 list-disc pl-6 text-muted-foreground">
                  {analysis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Seção de pré visualização de histórias de usuário */}
          {formattedMiroStories.length > 0 && (
            <div className="grid gap-2">
              <p className="font-semibold">Pré-visualização de Histórias do Miro</p>
              <div className="grid gap-2">
                {formattedMiroStories.map((story) => (
                  <div key={story.id} className="rounded-md border p-3">
                    <p className="font-medium">{story.title}</p>
                    {story.desc && <p className="text-xs whitespace-pre-wrap text-muted-foreground mt-1">{story.desc}</p>}
                    {story.labels?.length ? <p className="text-[10px] uppercase mt-2">Etiquetas: {story.labels.join(", ")}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="font-semibold">Agrupamento por etiquetas</p>
          <p className="text-muted-foreground">Use "Por tag" para criar listas automaticamente por etiqueta do Miro.</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="font-semibold">Templates</p>
          <p className="text-muted-foreground">Escolha formatos de histórias que combinem com seu time.</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="font-semibold">Sincronização</p>
          <p className="text-muted-foreground">Mantenha Miro e Trello atualizados continuamente.</p>
        </div>
      </div>
    </div>
  );
}
