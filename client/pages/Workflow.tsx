import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "@/lib/i18n-context";
import { toast } from "sonner";
import { ShieldCheck, Palette, FileCode2, Bot, Key, Terminal, RefreshCw, Cpu } from "lucide-react";

interface AIModelOption {
  id: string;
  name: string;
}

export default function Workflow() {
  const { t, language } = useTranslation();
  const [minQusScore, setMinQusScore] = useState<number>(70);
  const [defaultTemplate, setDefaultTemplate] = useState<string>("connextra");
  const [yellowColor, setYellowColor] = useState<string>("yellow");
  const [greenColor, setGreenColor] = useState<string>("green");
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>("openai");
  const [aiModel, setAiModel] = useState<string>("");
  const [aiApiKey, setAiApiKey] = useState<string>("");
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>("");
  
  const [availableModels, setAvailableModels] = useState<AIModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadModels(provider: string, key?: string, savedModel?: string) {
    const cleanKey = (key || aiApiKey || "").trim();
    setLoadingModels(true);
    try {
      const url = `/api/ai/models?provider=${provider}${cleanKey ? `&apiKey=${encodeURIComponent(cleanKey)}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      
      if (res.ok) {
        const data = await res.json();
        const modelsList: AIModelOption[] = data.models || [];
        setAvailableModels(modelsList);
        
        if (modelsList.length > 0) {
          const modelToKeep = savedModel || aiModel;
          const exists = modelsList.some((m) => m.id === modelToKeep);
          setAiModel(exists ? modelToKeep : modelsList[0].id);
        } else {
          setAvailableModels([]);
        }
      }
    } catch {
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }

  useEffect(() => {
    async function loadWorkflow() {
      try {
        const res = await fetch("/api/workflow/settings", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setMinQusScore(data.min_qus_score || 70);
          setDefaultTemplate(data.default_template || "connextra");
          setYellowColor(data.yellow_role_color || "yellow");
          setGreenColor(data.green_criteria_color || "green");
          setAiProvider(data.ai_provider || "openai");
          setAiModel(data.ai_model || "");
          setAiApiKey(data.ai_api_key || "");
          setCustomSystemPrompt(data.custom_system_prompt || "");

          if (data.ai_api_key) {
            loadModels(data.ai_provider || "openai", data.ai_api_key, data.ai_model);
          }
        }
      } catch {
        console.warn("Using local workflow defaults.");
      }
    }
    loadWorkflow();
  }, []);

  async function handleSaveWorkflow() {
    setSaving(true);
    try {
      const res = await fetch("/api/workflow/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_qus_score: minQusScore,
          default_template: defaultTemplate,
          yellow_role_color: yellowColor,
          green_criteria_color: greenColor,
          ai_provider: aiProvider,
          ai_model: aiModel,
          ai_api_key: aiApiKey.trim(),
          custom_system_prompt: customSystemPrompt
        }),
        credentials: "include"
      });

      if (res.ok) {
        toast.success(t("toast_workflow_saved"));
      }
    } catch {
      toast.error(t("toast_server_comm_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("wf_title")}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t("wf_subtitle")}</p>
      </div>

      <div className="grid gap-6">
        <Card className="shadow-sm border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <Bot className="h-4 w-4" /> {t("wf_ai_card_title")}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("wf_ai_card_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("wf_ai_provider")}</Label>
              <Select 
                value={aiProvider} 
                onValueChange={(val) => {
                  setAiProvider(val);
                  setAiModel("");
                  setAvailableModels([]);
                  loadModels(val, aiApiKey);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai" className="text-xs">OpenAI (ChatGPT)</SelectItem>
                  <SelectItem value="gemini" className="text-xs">Google Gemini</SelectItem>
                  <SelectItem value="claude" className="text-xs">Anthropic (Claude)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Key className="h-3 w-3" /> {t("wf_ai_key")} ({aiProvider.toUpperCase()})
              </Label>
              <div className="flex gap-2">
                <Input 
                  type={showApiKey ? "text" : "password"}
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  name="ai-provider-api-key"
                  className="h-9 text-xs bg-background"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => loadModels(aiProvider, aiApiKey, aiModel)}
                  disabled={loadingModels || !aiApiKey.trim()}
                  className="h-9 text-xs gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingModels ? 'animate-spin' : ''}`} />
                  {loadingModels ? t("wf_ai_fetching") : t("wf_ai_fetch_models")}
                </Button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Cpu className="h-3 w-3" /> {t("wf_ai_model_selected")} ({availableModels.length})
              </Label>
              <Select value={aiModel} onValueChange={setAiModel} disabled={loadingModels || availableModels.length === 0}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {availableModels.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs font-mono">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Terminal className="h-3 w-3" /> {t("wf_ai_sys_prompt")}
              </Label>
              <Textarea 
                placeholder={t("wf_ai_sys_prompt_placeholder")}
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                rows={3}
                className="text-xs bg-background leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> {t("wf_qus_filter_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <Label className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">{t("wf_qus_min_score")}</Label>
              <span className="font-extrabold text-primary text-sm">{minQusScore}%</span>
            </div>
            <Slider value={[minQusScore]} onValueChange={(val) => setMinQusScore(val[0])} max={100} min={30} step={5} className="py-2" />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-cyan-500" /> {t("wf_grammar_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("wf_grammar_template")}</Label>
              <Select value={defaultTemplate} onValueChange={setDefaultTemplate}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="connextra" className="text-xs">
                    {language === "en" ? "Connextra (As a [role], I want [action], so that [benefit])" :
                    language === "es" ? "Connextra (Como [rol], quiero [acción], para [beneficio])" :
                    "Connextra (Como [papel], quero [ação], para [benefício])"}
                  </SelectItem>
                  <SelectItem value="jtbd" className="text-xs">
                    {language === "en" ? "Job Story (When [situation], I want [action], so that [outcome])" :
                    language === "es" ? "Job Story (Cuando [situación], quiero [acción], para [resultado])" :
                    "Job Story (Quando [situação], quero [ação], para [resultado])"}
                  </SelectItem>
                  <SelectItem value="raw" className="text-xs">
                    {language === "en" ? "Raw Text (Original)" : language === "es" ? "Texto sin formato" : "Texto Puro (Original)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4 text-emerald-500" /> {t("wf_color_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("wf_color_actor")}</Label>
              <Select value={yellowColor} onValueChange={setYellowColor}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yellow" className="text-xs">{language === "pt" ? "Amarelo" : language === "es" ? "Amarillo" : "Yellow"}</SelectItem>
                  <SelectItem value="orange" className="text-xs">{language === "pt" ? "Laranja" : language === "es" ? "Naranja" : "Orange"}</SelectItem>
                  <SelectItem value="blue" className="text-xs">{language === "pt" ? "Azul" : language === "es" ? "Azul" : "Blue"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("wf_color_criteria")}</Label>
              <Select value={greenColor} onValueChange={setGreenColor}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green" className="text-xs">{language === "pt" ? "Verde" : language === "es" ? "Verde" : "Green"}</SelectItem>
                  <SelectItem value="pink" className="text-xs">{language === "pt" ? "Rosa" : language === "es" ? "Rosa" : "Pink"}</SelectItem>
                  <SelectItem value="cyan" className="text-xs">{language === "pt" ? "Ciano" : language === "es" ? "Cian" : "Cyan"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button onClick={handleSaveWorkflow} disabled={saving} className="h-9 text-xs font-semibold px-6">
            {saving ? t("wf_saving") : t("wf_save_btn")}
          </Button>
        </div>
      </div>
    </div>
  );
}