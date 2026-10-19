import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n-context";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { 
  ShieldAlert, 
  Type, 
  FileText, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Scissors,
  CheckCircle2, 
  ClipboardList, 
  Eye, 
  Kanban, 
  Link as LinkIcon, 
  Award, 
  Layers, 
  RefreshCw,
  ExternalLink,
  Search,
  Grid,
  List,
  Minimize2,
  Edit2,
  Trash2,
  GitCompare
} from "lucide-react";
import { Board } from "@shared/api";

export interface InvestMetrics {
  independent: boolean;
  negotiable: boolean;
  valuable: boolean;
  estimable: boolean;
  small: boolean;
  testable: boolean;
}

interface CuratedStory {
  miroItemId: string;
  title: string;
  desc: string;
  labels: string[];
  enabled?: boolean;
  score?: number;
  suggestions?: string[];
  invest?: InvestMetrics;
  exported?: boolean;
}

interface TrelloCardPreview {
  id: string;
  name: string;
  desc?: string;
  idList: string;
  url?: string;
}

const InvestBadgesStrip = ({ invest }: { invest?: InvestMetrics }) => {
  const { t } = useTranslation();
  if (!invest) return null;

  const items = [
    { key: "I", name: t("invest_i"), ok: invest.independent },
    { key: "N", name: t("invest_n"), ok: invest.negotiable },
    { key: "V", name: t("invest_v"), ok: invest.valuable },
    { key: "E", name: t("invest_e"), ok: invest.estimable },
    { key: "S", name: t("invest_s"), ok: invest.small },
    { key: "T", name: t("invest_t"), ok: invest.testable },
  ];

  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] font-bold text-muted-foreground mr-1">INVEST:</span>
      {items.map((item) => (
        <TooltipProvider key={item.key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span 
                className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black cursor-help transition-transform hover:scale-110 ${
                  item.ok 
                    ? "bg-emerald-500 text-white shadow-xs" 
                    : "bg-muted text-muted-foreground border border-dashed"
                }`}
              >
                {item.key}
              </span>
            </TooltipTrigger>
            <TooltipContent className="text-[10px]">
              {item.name}: {item.ok ? `✅ ${t("invest_ok")}` : `⚠️ ${t("invest_warn")}`}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

export const StoryCard = React.memo(({
  story,
  index,
  isDuplicate,
  minQusLimit,
  viewMode,
  onEdit,
  onToggle,
  onTriggerReanalysis,
  onSplit
}: {
  story: CuratedStory;
  index: number;
  isDuplicate: boolean;
  minQusLimit: number;
  viewMode: "grid" | "list" | "compact";
  onEdit: (index: number, field: "title" | "desc", value: string) => void;
  onToggle: (index: number, enabled: boolean) => void;
  onTriggerReanalysis: (index: number, text: string) => void;
  onSplit: (index: number) => void;
}) => {
  const { t, language } = useTranslation();
  const [localTitle, setLocalTitle] = useState(story.title);
  const [localDesc, setLocalDesc] = useState(story.desc);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [isRefiningWithAI, setIsRefiningWithAI] = useState(false);

  useEffect(() => {
    setLocalTitle(story.title);
    setLocalDesc(story.desc);
  }, [story.title, story.desc]);

  const scoreCardColor = (story.score || 0) >= 80 
    ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-300" 
    : (story.score || 0) >= 50 
      ? "bg-amber-500/5 hover:bg-amber-500/10 border-amber-300" 
      : "bg-red-500/5 hover:bg-red-500/10 border-red-300";

  const scoreBadgeColor = (story.score || 0) >= 80 
    ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
    : (story.score || 0) >= 50 
      ? "bg-amber-100 text-amber-800 border-amber-300" 
      : "bg-red-100 text-red-800 border-red-300";

  const leftBorderColor = !story.enabled
    ? "border-l-muted-foreground/30"
    : (story.score || 0) >= 80
      ? "border-l-emerald-500"
      : (story.score || 0) >= 50
        ? "border-l-amber-500"
        : "border-l-red-500";

  const isBelowQualityGate = story.enabled && story.score !== undefined && story.score < minQusLimit;
  const isNonAtomic = story.suggestions?.some((s) => {
    const lower = s.toLowerCase();
    return (
      lower.includes("atomicidade") ||
      lower.includes("atomicity") ||
      lower.includes("atomicidad") ||
      lower.includes("múltiplos") ||
      lower.includes("conjoined") ||
      lower.includes("múltiples")
    );
  });

  const isCardActive = story.enabled || story.exported;
  
  return (
    <div className={`relative rounded-lg border-2 border-l-4 ${leftBorderColor} p-4 flex flex-col gap-3 transition-all ${isCardActive ? `${scoreCardColor} shadow-sm` : 'opacity-40 bg-muted/10 border-dashed'}`}>
      
      <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("story_number")} #{index + 1}</span>
          {story.exported && (
            <Badge variant="outline" className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 border-emerald-300">
              ✅ Exportado
            </Badge>
          )}
          {story.score !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${scoreBadgeColor}`}>
              {t("quality_score")}: {story.score}%
            </span>
          )}
          <InvestBadgesStrip invest={story.invest} />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor={`onoff-${index}`} className="text-[10px] font-medium text-muted-foreground cursor-pointer">{t("enable_export")}</Label>
          <Switch id={`onoff-${index}`} checked={story.enabled} onCheckedChange={(val) => onToggle(index, val)} />
        </div>
      </div>

      {story.enabled && isDuplicate && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-100 border border-amber-300 p-1.5 rounded-md font-medium">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>{t("duplicate_warning")}</span>
        </div>
      )}

      {isBelowQualityGate && (
        <div className="flex items-center justify-between gap-2 text-[10px] text-red-800 bg-red-100 border border-red-300 p-1.5 rounded-md font-medium">
          <span className="truncate">{t("quality_gate_warning")} ({minQusLimit}%).</span>
          {isNonAtomic && (
            <Button type="button" size="sm" variant="outline" onClick={() => onSplit(index)} className="h-5 text-[9px] px-1.5 gap-1 border-red-300">
              <Scissors className="h-3 w-3 text-red-500" /> {t("split_btn")}
            </Button>
          )}
        </div>
      )}
      
      <div className="grid gap-1">
        <Label className="text-[9px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
          <Type className="h-3 w-3" /> {t("trello_title_label")}
        </Label>
        <Input 
          className="h-8 text-xs font-semibold bg-background/50 focus:bg-background"
          value={localTitle} 
          onChange={(e) => {
            setLocalTitle(e.target.value);
            onEdit(index, "title", e.target.value);
          }} 
          disabled={!isCardActive}
        />
      </div>

      {viewMode !== "compact" && (
        <div className="grid gap-1">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <Label className="text-[9px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
              <FileText className="h-3 w-3" /> {t("structure_bdd_label")}
            </Label>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* 1. Botão Reanalisar manual */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!isCardActive}
                onClick={() => onTriggerReanalysis(index, localDesc)}
                className="text-[9px] h-6 px-2 gap-1 text-muted-foreground hover:text-foreground border border-dashed"
                title={t("reanalyze_tooltip")}
              >
                <RefreshCw className="h-3 w-3" /> {t("reanalyze_btn")}
              </Button>

              {/* 2. Botão Dividir com IA (Aparece sempre que a história for não-atômica) */}
              {(!story.invest?.independent || isNonAtomic) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!isCardActive}
                  onClick={() => onSplit(index)}
                  className="text-[9px] h-6 px-2 gap-1 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Scissors className="h-3 w-3 text-red-500" /> {t("split_btn")}
                </Button>
              )}

              {/* 3. Botão Refinar com IA */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!isCardActive || isRefiningWithAI}
                onClick={async () => {
                  setIsRefiningWithAI(true);
                  try {
                    const res = await fetch("/api/ai/refine", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ text: localDesc, language }),
                      credentials: "include"
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const newTitle = data.title || localTitle;
                      const isCardEnglish = /\b(as an?|i want|so that)\b/i.test(localDesc.toLowerCase());
                      const isCardSpanish = /\b(quiero|para que)\b/i.test(localDesc.toLowerCase());

                      const bddHeader = isCardEnglish
                        ? "\n\n**Acceptance Criteria:**\n- "
                        : isCardSpanish
                          ? "\n\n**Criterios de Aceptación:**\n- "
                          : "\n\n**Critérios de Aceitação:**\n- ";

                      const newDesc = (data.fullStory || localDesc) + bddHeader + (data.acceptanceCriteria || []).join("\n- ");
                      setLocalTitle(newTitle);
                      setLocalDesc(newDesc);
                      onEdit(index, "title", newTitle);
                      onEdit(index, "desc", newDesc);
                      
                      // Dispara a reanálise imediata após o refinamento
                      onTriggerReanalysis(index, newDesc);
                      toast.success(t("toast_story_refined"));
                    }
                  } catch {
                    toast.error(t("toast_ai_error"));
                  } finally {
                    setIsRefiningWithAI(false);
                  }
                }}
                className="text-[9px] h-6 px-2 gap-1 text-primary border-primary/30 hover:bg-primary/5"
              >
                <Sparkles className="h-3 w-3" /> {isRefiningWithAI ? t("refining") : t("refine_ai")}
              </Button>
            </div>
          </div>

          <Textarea 
            className="text-xs leading-relaxed font-sans bg-background/50 focus:bg-background mt-1"
            value={localDesc} 
            rows={viewMode === "grid" ? 4 : 5} 
            onChange={(e) => {
              setLocalDesc(e.target.value);
              onEdit(index, "desc", e.target.value);
            }} 
            onBlur={() => {
              if (story.enabled) onTriggerReanalysis(index, localDesc);
            }}
            disabled={!isCardActive}
          />
        </div>
      )}

      {story.enabled && story.suggestions && story.suggestions.length > 0 && (
        <div className="border rounded bg-muted/20 border-border/40">
          <button 
            type="button"
            onClick={() => setIsGuidelinesOpen(!isGuidelinesOpen)}
            className="w-full flex items-center justify-between p-1.5 text-[9px] font-bold text-muted-foreground hover:bg-muted/40"
          >
            <span className="flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 text-amber-500" /> 
              {t("guidelines_title")} ({story.suggestions.length})
            </span>
            {isGuidelinesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {isGuidelinesOpen && (
            <div className="p-2 border-t border-border/40 bg-card/60 text-[9px] text-muted-foreground space-y-1">
              <ul className="list-disc list-inside space-y-0.5">
                {story.suggestions.map((s, sIdx) => <li key={sIdx}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

StoryCard.displayName = "StoryCard";

export default function Stories() {
  const { t, language } = useTranslation();
  const [searchParams] = useSearchParams();
  const [miroId, setMiroId] = useState(searchParams.get("miroBoardId") || "");
  const [trelloId, setTrelloId] = useState(searchParams.get("trelloBoardId") || "");
  const [targetListId, setTargetListId] = useState("");
  
  const [curatedStories, setCuratedStories] = useState<CuratedStory[]>([]);
  const [curationFilter, setCurationFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "compact">("grid");

  const [conversionType, setConversionType] = useState<"auto" | "grafo" | "espacial" | "standalone">("auto");
  const [template, setTemplate] = useState<"connextra" | "jtbd" | "custom" | "raw">("connextra");
  const [customTemplateText, setCustomTemplateText] = useState("Como um [ator], gostaria de [ação], com o propósito de [benefício]");

  useEffect(() => {
    if (template === "custom") {
      if (language === "en") {
        setCustomTemplateText("As a [actor], I would like to [action], so that [benefit]");
      } else if (language === "es") {
        setCustomTemplateText("Como [actor], me gustaría [acción], a fin de [beneficio]");
      } else {
        setCustomTemplateText("Como um [ator], gostaria de [ação], com o propósito de [benefício]");
      }
    }
  }, [language, template]);
  
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [miroBoards, setMiroBoards] = useState<Board[]>([]);
  const [trelloBoards, setTrelloBoards] = useState<Board[]>([]);
  const [trelloLists, setTrelloLists] = useState<{ id: string; name: string }[]>([]);
  const [trelloCards, setTrelloCards] = useState<TrelloCardPreview[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const [selectedTrelloCard, setSelectedTrelloCard] = useState<TrelloCardPreview | null>(null);
  const [editCardName, setEditCardName] = useState("");
  const [editCardDesc, setEditCardDesc] = useState("");
  const [updatingCard, setUpdatingCard] = useState(false);
  const [archivingCard, setArchivingCard] = useState(false);

  const [minQusLimit, setMinQusLimit] = useState<number>(70);
  const [syncCheckOpen, setSyncCheckOpen] = useState(false);
  const [syncDiffs, setSyncDiffs] = useState<any[]>([]);
  const [loadingSyncCheck, setLoadingSyncCheck] = useState(false);

  const [splittingIndex, setSplitIndex] = useState<number | null>(null);
  const [splitResults, setSplitResults] = useState<Array<{ title: string; desc: string }>>([]);
  const [loadingSplit, setLoadingSplit] = useState(false);

  const [syncReport, setSyncReport] = useState<{ open: boolean; created: number; logs: string[] }>({
    open: false,
    created: 0,
    logs: []
  });

  useEffect(() => {
    async function loadBoards() {
      try {
        const [miroRes, trelloRes] = await Promise.all([
          fetch("/api/miro/boards", { credentials: "include" }),
          fetch("/api/trello/boards", { credentials: "include" })
        ]);
        if (miroRes.ok && trelloRes.ok) {
          const miro = await miroRes.json();
          const trello = await trelloRes.json();

          const sortedMiro = (miro.boards || []).sort((a: any, b: any) => a.name.localeCompare(b.name));
          const sortedTrello = (trello.boards || []).sort((a: any, b: any) => a.name.localeCompare(b.name));

          setMiroBoards(sortedMiro);
          setTrelloBoards(sortedTrello);
        }
      } catch {
        toast.error(t("toast_load_repos_error"));
      }
    }
    loadBoards();
  }, []);

  useEffect(() => {
    async function fetchWorkflowSettings() {
      try {
        const res = await fetch("/api/workflow/settings", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.default_template) setTemplate(data.default_template);
          if (data.min_qus_score) setMinQusLimit(data.min_qus_score);
        }
      } catch {
        console.warn("Usando parâmetros de workflow locais.");
      }
    }
    fetchWorkflowSettings();
  }, []);

  async function fetchLiveTrelloKanban() {
    if (!trelloId) return;
    setLoadingCards(true);
    try {
      const [listRes, cardRes] = await Promise.all([
        fetch(`/api/trello/lists?boardId=${encodeURIComponent(trelloId)}`, { credentials: "include" }),
        fetch(`/api/trello/boards/${encodeURIComponent(trelloId)}/cards`, { credentials: "include" })
      ]);

      if (listRes.ok) {
        const listData = await listRes.json();
        setTrelloLists(listData.lists || []);
        if (listData.lists?.length > 0 && !targetListId) {
          setTargetListId(listData.lists[0].id);
        }
      }

      if (cardRes.ok) {
        const cardData = await cardRes.json();
        setTrelloCards(cardData.cards || []);
      }
    } catch {
      toast.error(t("toast_load_lists_error"));
    } finally {
      setLoadingCards(false);
    }
  }

  useEffect(() => {
    fetchLiveTrelloKanban();
  }, [trelloId]);

  useEffect(() => {
    if (selectedTrelloCard) {
      setEditCardName(selectedTrelloCard.name);
      setEditCardDesc(selectedTrelloCard.desc || "");
    }
  }, [selectedTrelloCard]);

  async function handleSaveTrelloCard() {
    if (!selectedTrelloCard) return;
    setUpdatingCard(true);
    try {
      const res = await fetch(`/api/trello/cards/${selectedTrelloCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editCardName, desc: editCardDesc }),
        credentials: "include"
      });

      if (res.ok) {
        toast.success(t("toast_card_updated"));
        setSelectedTrelloCard(null);
        fetchLiveTrelloKanban();
      } else {
        toast.error(t("toast_card_update_error"));
      }
    } catch {
      toast.error(t("toast_server_comm_error"));
    } finally {
      setUpdatingCard(false);
    }
  }

  async function handleArchiveTrelloCard() {
    if (!selectedTrelloCard) return;
    setArchivingCard(true);
    try {
      const res = await fetch(`/api/trello/cards/${selectedTrelloCard.id}/archive`, {
        method: "POST",
        credentials: "include"
      });

      if (res.ok) {
        toast.success(t("toast_card_archived"));
        setSelectedTrelloCard(null);
        fetchLiveTrelloKanban();
      } else {
        toast.error(t("toast_card_archive_error"));
      }
    } catch {
      toast.error(t("toast_server_comm_error"));
    } finally {
      setArchivingCard(false);
    }
  }

  async function handleCardDrop(cardId: string, targetListId: string) {
    setTrelloCards(prev => prev.map(c => c.id === cardId ? { ...c, idList: targetListId } : c));
    
    try {
      await fetch(`/api/trello/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idList: targetListId }),
        credentials: "include"
      });
    } catch {
      toast.error(t("toast_card_update_error"));
      fetchLiveTrelloKanban();
    }
  }

  const runQualityAnalysis = useCallback(async (text: string) => {
    try {
      const res = await fetch("/api/convert/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
        credentials: "include"
      });
      if (res.ok) return await res.json();
    } catch {
      console.warn("Análise de qualidade offline.");
    }
    return { score: 60, suggestions: [], invest: undefined };
  }, [language]);

  async function loadPreview() {
    if (!miroId) return;
    setLoadingPreview(true);
    try {
      const queryParams = new URLSearchParams({
        miroBoardId: miroId,
        conversionType,
        templateFormat: template,
        customTemplateText: template === "custom" ? customTemplateText : "",
        language: language || "pt",
      });

      const res = await fetch(`/api/convert/preview?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      
      const mapped = await Promise.all((data.stories || []).map(async (s: CuratedStory) => {
        const analysis = await runQualityAnalysis(s.desc);
        return { 
          ...s, 
          enabled: true, 
          score: analysis.score, 
          suggestions: analysis.suggestions,
          invest: analysis.invest
        };
      }));
      setCuratedStories(mapped);
      toast.success(t("toast_notes_loaded"));
    } catch {
      toast.error(t("toast_notes_error"));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleCheckSync() {
    setLoadingSyncCheck(true);
    try {
      const res = await fetch("/api/convert/sync-check", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSyncDiffs(data.mappings || []);
        setSyncCheckOpen(true);
      }
    } catch {
      toast.error(t("toast_sync_check_error"));
    } finally {
      setLoadingSyncCheck(false);
    }
  }

  async function applyPullSync(mappingId: string) {
    try {
      const res = await fetch("/api/convert/sync-pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingId }),
        credentials: "include"
      });
      if (res.ok) {
        toast.success(t("toast_miro_updated"));
        handleCheckSync();
      }
    } catch {
      toast.error(t("toast_sync_apply_error"));
    }
  }

  const handleEditStory = useCallback((index: number, field: "title" | "desc", value: string) => {
    setCuratedStories(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const triggerReanalysis = useCallback(async (index: number, text: string) => {
    const analysis = await runQualityAnalysis(text);
    setCuratedStories(prev => {
      const next = [...prev];
      next[index] = { 
        ...next[index], 
        score: analysis.score, 
        suggestions: analysis.suggestions,
        invest: analysis.invest
      };
      return next;
    });
  }, [runQualityAnalysis]);

  const handleToggleStory = useCallback((index: number, enabled: boolean) => {
    setCuratedStories(prev => {
      const next = [...prev];
      next[index] = { ...next[index], enabled };
      return next;
    });
  }, []);

  const handleEnableAll = (enabled: boolean) => {
    setCuratedStories(prev => prev.map(story => ({ ...story, enabled })));
    toast.info(enabled ? t("toast_all_enabled") : t("toast_all_disabled"));
  };

  const handleTriggerSplit = async (index: number) => {
    const targetStory = curatedStories[index];
    if (!targetStory) return;

    setSplitIndex(index);
    setLoadingSplit(true);
    try {
      const res = await fetch("/api/ai/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: targetStory.desc, language }),
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setSplitResults(data.stories || []);
      } else {
        toast.error(t("toast_split_fail"));
      }
    } catch {
      toast.error(t("toast_split_comm_error"));
    } finally {
      setLoadingSplit(false);
    }
  };

  const handleApplySplitResults = async () => {
    if (splittingIndex === null || splitResults.length === 0) return;

    const original = curatedStories[splittingIndex];
    const newItems: CuratedStory[] = await Promise.all(
      splitResults.map(async (r, i) => {
        const analysis = await runQualityAnalysis(r.desc);
        return {
          miroItemId: `${original.miroItemId}_sub_${i + 1}`,
          title: r.title,
          desc: r.desc,
          labels: original.labels,
          enabled: true,
          score: analysis.score,
          suggestions: analysis.suggestions,
          invest: analysis.invest
        };
      })
    );

    setCuratedStories(prev => {
      const next = [...prev];
      next.splice(splittingIndex, 1, ...newItems);
      return next;
    });

    toast.success(t("toast_split_success", { count: newItems.length }));
    setSplitIndex(null);
    setSplitResults([]);
  };

  // Exportação com envio de idioma para o backend
  async function commitStories() {
    const activeStories = curatedStories.filter(s => s.enabled);
    if (activeStories.length === 0) {
      toast.error(t("toast_export_min_one"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/convert/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          miroBoardId: miroId,
          trelloBoardId: trelloId,
          targetListId,
          stories: activeStories,
          language
        }),
        credentials: "include"
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Falha ao comunicar com o servidor.");
      }

      if (data.created > 0) {
        toast.success(t("toast_export_success", { count: data.created }));
      } else {
        toast.warning(t("toast_export_zero"));
      }

      setSyncReport({ open: true, created: data.created, logs: data.details || [] });
      setCuratedStories(prev => prev.map(s => s.enabled ? { ...s, exported: true } : s));
      fetchLiveTrelloKanban();
    } catch (err: any) {
      toast.error(err.message || t("toast_transfer_error"));
    } finally {
      setLoading(false);
    }
  }

  const filteredCurationList = useMemo(() => {
    return curatedStories.filter((s) => {
      const matchesSearch = searchQuery.trim() === "" || 
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.desc.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (curationFilter === "enabled") return s.enabled;
      if (curationFilter === "high") return s.enabled && (s.score || 0) >= 80;
      if (curationFilter === "review") return s.enabled && (s.score || 0) < 80;
      if (curationFilter === "disabled") return !s.enabled;
      return true;
    });
  }, [curatedStories, curationFilter, searchQuery]);

  const averageQualityScore = useMemo(() => {
    const active = curatedStories.filter(s => s.enabled);
    if (active.length === 0) return 0;
    const total = active.reduce((sum, s) => sum + (s.score || 0), 0);
    return Math.round(total / active.length);
  }, [curatedStories]);

  const isDuplicateDetection = useMemo(() => {
    return (title: string) => {
      const cleanTitle = title.trim().toLowerCase();
      return trelloCards.some(card => card.name.trim().toLowerCase() === cleanTitle);
    };
  }, [trelloCards]);

  return (
    <div className="container py-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
      
      {/* Faixa Superior de Passos do Mapeamento */}
      <div className="bg-card border rounded-xl p-3.5 px-6 flex items-center justify-between gap-4 text-xs font-semibold shadow-xs">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="flex items-center gap-2 text-primary">
            <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] bg-primary text-white font-bold">1</span>
            {t("step1_map")}
          </span>
          <span className="flex items-center gap-2 text-primary">
            <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] bg-primary text-white font-bold">2</span>
            {t("step2_extract")}
          </span>
          <span className="flex items-center gap-2 text-primary">
            <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] bg-primary text-white font-bold">3</span>
            {t("step3_sync")}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={syncCheckOpen} onOpenChange={setSyncCheckOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCheckSync} variant="outline" size="sm" disabled={loadingSyncCheck} className="h-8 text-xs gap-1.5 border-cyan-500/30 text-cyan-600 hover:bg-cyan-50/10">
                <RefreshCw className={`h-3.5 w-3.5 ${loadingSyncCheck ? 'animate-spin' : ''}`} /> 
                {loadingSyncCheck ? t("check_sync_checking") : t("check_sync_btn")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("sync_diff_title")}</DialogTitle>
                <DialogDescription className="text-xs">
                  {t("sync_diff_desc")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 my-2 max-h-60 overflow-y-auto pr-1">
                {syncDiffs.map((diff) => (
                  <div key={diff.mappingId} className="p-3 border rounded-md flex items-center justify-between text-xs bg-muted/20">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold truncate">{diff.title || "Card"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {diff.isDivergent ? t("sync_diff_divergent") : t("sync_diff_synced")}
                      </p>
                    </div>
                    {diff.isDivergent && (
                      <Button size="sm" className="h-7 text-[10px]" onClick={() => applyPullSync(diff.mappingId)}>
                        {t("sync_diff_update_btn")}
                      </Button>
                    )}
                  </div>
                ))}
                {syncDiffs.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-4">{t("sync_diff_empty")}</p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            <GitCompare className="h-3.5 w-3.5 text-cyan-500" /> {t("dual_track_active")}
          </div>
        </div>
      </div>

      {/* Mapeador de Escopo */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5 text-primary" /> {t("scope_title")}
          </h2>

          <div className="flex items-center gap-2">
            {miroId && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(`https://miro.com/app/board/${miroId}`, "_blank")}
                className="text-[10px] h-7 gap-1 border-primary/20 hover:bg-primary/5"
              >
                <ExternalLink className="h-3 w-3" /> {t("open_miro_board")}
              </Button>
            )}
            {trelloId && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(`https://trello.com/b/${trelloId}`, "_blank")}
                className="text-[10px] h-7 gap-1 border-primary/20 hover:bg-primary/5"
              >
                <ExternalLink className="h-3 w-3" /> {t("open_trello_board")}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-5 items-end">
          <div className="grid gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t("miro_source")}</Label>
            <Select value={miroId} onValueChange={setMiroId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t("select_board_placeholder")} /></SelectTrigger>
              <SelectContent>
                {miroBoards.map((b) => <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t("trello_target")}</Label>
            <Select value={trelloId} onValueChange={setTrelloId}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t("select_board_placeholder")} /></SelectTrigger>
              <SelectContent>
                {trelloBoards.map((b) => <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t("mapping_algorithm")}</Label>
            <Select value={conversionType} onValueChange={(v: any) => setConversionType(v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto" className="text-xs">{t("algo_auto")}</SelectItem>
                <SelectItem value="grafo" className="text-xs">{t("algo_graph")}</SelectItem>
                <SelectItem value="espacial" className="text-xs">{t("algo_spatial")}</SelectItem>
                <SelectItem value="standalone" className="text-xs">{t("algo_standalone")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t("target_column")}</Label>
            <Select value={targetListId} onValueChange={setTargetListId} disabled={trelloLists.length === 0}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t("target_column_placeholder")} /></SelectTrigger>
              <SelectContent>
                {trelloLists.map((l) => <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button onClick={loadPreview} className="w-full h-9 text-xs font-semibold" disabled={loadingPreview || !miroId}>
              {loadingPreview ? t("mapping_in_progress") : t("map_notes_btn")}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor de Curadoria */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="font-extrabold text-base tracking-tight text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> {t("curation_title")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("curation_subtitle")}</p>
          </div>

          {curatedStories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder={t("search_stories_placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8 bg-background"
                />
              </div>

              <div className="flex items-center gap-1 border rounded bg-muted/30 p-0.5">
                <Button variant="ghost" size="sm" onClick={() => handleEnableAll(true)} className="h-7 text-[10px] px-2">
                  {t("select_all")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEnableAll(false)} className="h-7 text-[10px] px-2">
                  {t("deselect_all")}
                </Button>
                {/* Botão de Limpar Lista de Curadoria */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setCuratedStories([]);
                    toast.info(t("toast_stories_cleared"));
                  }} 
                  className="h-7 text-[10px] px-2 gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title={t("clear_stories_tooltip")}
                >
                  <Trash2 className="h-3 w-3" /> {t("clear_stories_btn")}
                </Button>
              </div>

              <div className="flex items-center gap-0.5 border rounded bg-muted/40 p-0.5">
                <Button 
                  variant={viewMode === "grid" ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setViewMode("grid")}
                  className="h-7 px-2 text-[10px] gap-1"
                >
                  <Grid className="h-3 w-3" /> {t("view_grid")}
                </Button>
                <Button 
                  variant={viewMode === "list" ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setViewMode("list")}
                  className="h-7 px-2 text-[10px] gap-1"
                >
                  <List className="h-3 w-3" /> {t("view_list")}
                </Button>
                <Button 
                  variant={viewMode === "compact" ? "secondary" : "ghost"} 
                  size="sm" 
                  onClick={() => setViewMode("compact")}
                  className="h-7 px-2 text-[10px] gap-1"
                >
                  <Minimize2 className="h-3 w-3" /> {t("view_compact")}
                </Button>
              </div>

              <Tabs value={curationFilter} onValueChange={setCurationFilter} className="w-auto">
                <TabsList className="grid grid-cols-4 h-8 text-[10px] p-0.5 bg-muted">
                  <TabsTrigger value="all" className="h-7 px-2">{t("filter_all")} ({curatedStories.length})</TabsTrigger>
                  <TabsTrigger value="high" className="h-7 px-2 text-emerald-600 font-bold">{t("filter_high")}</TabsTrigger>
                  <TabsTrigger value="review" className="h-7 px-2 text-amber-500 font-bold">{t("filter_review")}</TabsTrigger>
                  <TabsTrigger value="disabled" className="h-7 px-2">{t("filter_disabled")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </div>

        {curatedStories.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-3 rounded-lg border text-xs text-muted-foreground">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("avg_qu_score")}</span>
              <span className="text-base font-black text-foreground mt-0.5 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-500" /> {averageQualityScore}%
              </span>
            </div>
            <div className="flex flex-col border-l pl-4">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("ready_stories")}</span>
              <span className="text-base font-black text-emerald-600 mt-0.5">
                {curatedStories.filter(s => s.enabled).length} / {curatedStories.length}
              </span>
            </div>
            <div className="flex flex-col border-l pl-4 hidden md:flex">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("curation_origin_graph")}</span>
              <span className="text-xs font-semibold text-foreground mt-0.5 truncate">
                {miroBoards.find(b => b.id === miroId)?.name || t("active_miro_board")}
              </span>
            </div>
            <div className="flex flex-col border-l pl-4 hidden md:flex">
              <span className="text-[10px] font-bold uppercase tracking-wider">{t("curation_target_kanban")}</span>
              <span className="text-xs font-semibold text-foreground mt-0.5 truncate">
                {trelloBoards.find(b => b.id === trelloId)?.name || t("active_trello_board")}
              </span>
            </div>
          </div>
        )}

        {curatedStories.length === 0 ? (
          <div className="h-56 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-6 gap-3">
            <ClipboardList className="h-8 w-8 text-muted-foreground opacity-40" />
            <p className="max-w-md leading-relaxed">{t("no_stories_mapped")}</p>
          </div>
        ) : (
          <div className={`max-h-[650px] overflow-y-auto pr-1.5 ${
            viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
              : viewMode === "compact"
                ? "flex flex-col gap-2"
                : "flex flex-col gap-3.5"
          }`}>
            {filteredCurationList.map((story, idx) => (
              <StoryCard 
                key={story.miroItemId}
                story={story}
                index={idx}
                isDuplicate={isDuplicateDetection(story.title)}
                minQusLimit={minQusLimit}
                viewMode={viewMode}
                onEdit={handleEditStory}
                onToggle={handleToggleStory}
                onTriggerReanalysis={triggerReanalysis}
                onSplit={handleTriggerSplit}
              />
            ))}
          </div>
        )}

        <div className="pt-2 border-t flex justify-end">
          <Button 
            onClick={commitStories} 
            className="w-full md:w-auto px-8 h-10 text-xs font-bold bg-primary hover:bg-primary/90" 
            disabled={loading || curatedStories.length === 0}
          >
            {loading ? t("exporting_btn") : t("export_btn")}
          </Button>
        </div>
      </div>

      {/* Visualizadores Dinâmicos */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <Tabs defaultValue="trello-kanban" className="w-full">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-500" /> {t("visualizers_title")}
            </h2>
            
            <div className="flex items-center gap-2">
              {miroId && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(`https://miro.com/app/board/${miroId}`, "_blank")}
                  className="text-[10px] h-7 gap-1 border-primary/20 hover:bg-primary/5"
                >
                  <ExternalLink className="h-3 w-3" /> {t("open_miro_board")}
                </Button>
              )}
              {trelloId && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(`https://trello.com/b/${trelloId}`, "_blank")}
                  className="text-[10px] h-7 gap-1 border-primary/20 hover:bg-primary/5"
                >
                  <ExternalLink className="h-3 w-3" /> {t("open_trello_board")}
                </Button>
              )}
              <TabsList className="grid grid-cols-2 w-48 h-8 p-0.5 bg-muted">
                <TabsTrigger value="miro-embed" className="h-7 text-xs flex gap-1.5"><LinkIcon className="h-3.5 w-3.5" /> Miro</TabsTrigger>
                <TabsTrigger value="trello-kanban" className="h-7 text-xs flex gap-1.5"><Kanban className="h-3.5 w-3.5" /> Trello</TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          <TabsContent value="miro-embed" className="mt-0 animate-fade-in">
            {miroId ? (
              <div className="rounded-xl overflow-hidden border bg-black/5 aspect-[21/9] flex flex-col">
                <iframe 
                  src={`https://miro.com/app/live-embed/${miroId}/?autoplay=true`}
                  className="w-full flex-1 border-0"
                  allow="fullscreen; clipboard-read; clipboard-write"
                  title="Miro Board Live Embed"
                />
              </div>
            ) : (
              <div className="h-64 border border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-4 gap-2.5">
                <LinkIcon className="h-8 w-8 opacity-30 text-muted-foreground" />
                <p>{t("empty_miro_embed")}</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="trello-kanban" className="mt-0 animate-fade-in">
            {trelloId ? (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <p>{t("kanban_hint")}</p>
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-3 border" onClick={fetchLiveTrelloKanban}>
                    <RefreshCw className="h-3 w-3 mr-1" /> {t("reload_kanban")}
                  </Button>
                </div>
                
                {loadingCards ? (
                  <div className="h-[300px] flex items-center justify-center text-xs text-muted-foreground">{t("stories_syncing_kanban")}</div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-3 h-[420px]">
                    {trelloLists.map((list) => {
                      const listCards = trelloCards.filter(c => c.idList === list.id);
                      
                      return (
                        <div 
                          key={list.id} 
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const cardId = e.dataTransfer.getData("text/plain");
                            if (cardId) handleCardDrop(cardId, list.id);
                          }}
                          className="min-w-[240px] max-w-[280px] bg-muted/30 rounded-xl p-3 flex flex-col gap-2.5 h-full border text-xs"
                        >
                          <div className="flex items-center justify-between border-b pb-1.5 font-bold">
                            <h4 className="truncate text-foreground pr-1">{list.name}</h4>
                            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 flex items-center justify-center">
                              {listCards.length}
                            </Badge>
                          </div>

                          <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
                            {listCards.map((card) => (
                              <div 
                                key={card.id} 
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
                                onClick={() => setSelectedTrelloCard(card)}
                                className="bg-card border rounded-lg p-2.5 flex flex-col gap-1.5 shadow-xs hover:border-primary/50 hover:bg-accent/10 transition-all cursor-grab active:cursor-grabbing group"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <p className="font-semibold text-foreground leading-tight group-hover:text-primary transition-colors flex-1 truncate">
                                    {card.name}
                                  </p>
                                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>

                                {card.desc && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                                    {card.desc}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 border border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-4 gap-2.5">
                <Kanban className="h-8 w-8 opacity-30 text-muted-foreground" />
                <p>{t("empty_trello_embed")}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Edição do Cartão do Trello Selecionado */}
      <Dialog open={!!selectedTrelloCard} onOpenChange={(val) => { if (!val) setSelectedTrelloCard(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Edit2 className="h-4 w-4" /> {t("edit_card_trello")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t("edit_card_subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 text-xs">
            <div className="grid gap-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">{t("card_name")}</Label>
              <Input 
                value={editCardName}
                onChange={(e) => setEditCardName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">{t("card_desc")}</Label>
              <Textarea 
                value={editCardDesc}
                onChange={(e) => setEditCardDesc(e.target.value)}
                rows={5}
                className="text-xs font-sans leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row justify-between gap-2">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleArchiveTrelloCard}
              disabled={archivingCard}
              className="text-xs gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> {archivingCard ? t("archiving") : t("archive_card")}
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedTrelloCard(null)}>{t("cancel")}</Button>
              <Button size="sm" onClick={handleSaveTrelloCard} disabled={updatingCard || !editCardName.trim()}>
                {updatingCard ? t("saving") : t("save_changes")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Divisão por IA */}
      <Dialog open={splittingIndex !== null} onOpenChange={(val) => { if (!val) setSplitIndex(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Scissors className="h-4 w-4" /> {t("split_modal_title")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t("split_modal_desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2 max-h-60 overflow-y-auto pr-1">
            {loadingSplit ? (
              <p className="text-xs text-muted-foreground text-center py-6">{t("stories_loading_split")}</p>
            ) : (
              splitResults.map((item, i) => (
                <div key={i} className="p-3 border rounded-md bg-muted/20 text-xs space-y-1">
                  <p className="font-bold text-primary">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-normal">{item.desc}</p>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSplitIndex(null)}>{t("cancel")}</Button>
            <Button size="sm" onClick={handleApplySplitResults} disabled={loadingSplit || splitResults.length === 0}>
              {t("apply_split")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Relatório da Sincronização */}
      <Dialog open={syncReport.open} onOpenChange={(val) => setSyncReport(prev => ({ ...prev, open: val }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 font-extrabold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> {t("sync_report_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 my-2 text-xs">
            <div className="rounded border p-3 bg-emerald-50/10">
              <p className="text-muted-foreground">
                {t("stories_cards_injected_prefix")} <strong>{syncReport.created}</strong> {t("cards_injected")}
              </p>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">{t("audit_trail")}:</Label>
              <div className="rounded border bg-muted/20 p-2 text-[10px] max-h-36 overflow-y-auto space-y-1">
                {syncReport.logs.map((log, idx) => <p key={idx}>{log}</p>)}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {trelloId && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(`https://trello.com/b/${trelloId}`, "_blank")} 
                className="w-full sm:w-auto text-xs gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {t("open_trello_board")}
              </Button>
            )}
            <Button size="sm" onClick={() => setSyncReport(prev => ({ ...prev, open: false }))} className="w-full sm:w-auto text-xs">
              {t("close_report")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}