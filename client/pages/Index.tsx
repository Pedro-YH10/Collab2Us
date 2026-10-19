import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/i18n-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Layers, FolderKanban, Activity, Play, Sparkles } from "lucide-react";

export default function Index() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  
  const [miroConnected, setMiroConnected] = useState<boolean>(() => {
    return sessionStorage.getItem("c2u_miro_active") === "true";
  });
  const [trelloConnected, setTrelloConnected] = useState<boolean>(() => {
    return sessionStorage.getItem("c2u_trello_active") === "true";
  });

  const [demoInput, setDemoInput] = useState(t("home_demo_default_input"));
  const [isSimulating, setIsSimulating] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);

  useEffect(() => {
    setDemoInput(t("home_demo_default_input"));
  }, [t]);

  useEffect(() => {
    async function checkTokens() {
      try {
        const [mRes, tRes] = await Promise.all([
          fetch("/api/integrations/token?provider=miro", { credentials: "include" }),
          fetch("/api/integrations/token?provider=trello", { credentials: "include" })
        ]);

        const mData = mRes.ok ? await mRes.json() : null;
        const tData = tRes.ok ? await tRes.json() : null;

        const isMiro = Boolean(mData?.isValid);
        const isTrello = Boolean(tData?.isValid);

        setMiroConnected(isMiro);
        setTrelloConnected(isTrello);
        sessionStorage.setItem("c2u_miro_active", String(isMiro));
        sessionStorage.setItem("c2u_trello_active", String(isTrello));
      } catch {
        setMiroConnected(false);
        setTrelloConnected(false);
        sessionStorage.removeItem("c2u_miro_active");
        sessionStorage.removeItem("c2u_trello_active");
      }
    }

    if (user) checkTokens();
  }, [user]);

  const runSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setDemoResult({
        title: t("home_demo_story_title"),
        desc: t("home_demo_story_desc"),
        labels: ["e-commerce", "ux", "core"]
      });
      setIsSimulating(false);
    }, 600);
  };

  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground text-sm flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="space-y-3">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">{t("loading_env")}</p>
        </div>
      </div>
    );
  }

  const userFirstName = user?.name?.trim().split(/\s+/)[0] || t("user_fallback");

  if (user) {
    return (
      <div className="container py-10 max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div className="border-b pb-6">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">{t("home_badge_hub")}</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">
            {t("home_welcome")}, {userFirstName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("home_subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-xs border-primary/20 bg-primary/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-primary tracking-wider">{t("home_miro_status")}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${miroConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    {miroConnected ? t("home_connected") : t("home_disconnected")}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("home_miro_desc")}</p>
              <Button asChild size="sm" variant="outline" className="w-full text-xs h-8">
                <Link to="/settings">{t("home_manage")} Miro</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-cyan-200 bg-cyan-50/10">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-cyan-600 tracking-wider">{t("home_trello_status")}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${trelloConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    {trelloConnected ? t("home_connected") : t("home_disconnected")}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("home_trello_desc")}</p>
              <Button asChild size="sm" variant="outline" className="w-full text-xs h-8">
                <Link to="/settings">{t("home_manage")} Trello</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-emerald-200 bg-emerald-50/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-emerald-600 tracking-wider">{t("home_account_session")}</span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs text-muted-foreground">{t("home_account_desc")}</p>
              <Button asChild size="sm" variant="outline" className="w-full text-xs h-8">
                <Link to="/settings">{t("home_view_settings")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="border rounded-xl p-6 space-y-4 bg-card shadow-sm">
            <h2 className="font-bold text-lg tracking-tight">{t("home_sync_title")}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("home_sync_desc")}
            </p>
            <div className="flex gap-2">
              <Button asChild className="gap-1.5 text-xs h-9">
                <Link to="/boards"><FolderKanban className="h-3.5 w-3.5" /> {t("home_select_boards")}</Link>
              </Button>
              <Button asChild variant="outline" className="gap-1.5 text-xs h-9">
                <Link to="/stories"><Layers className="h-3.5 w-3.5" /> {t("home_map_stories")}</Link>
              </Button>
            </div>
          </div>

          <div className="border rounded-xl p-6 space-y-4 bg-card shadow-sm">
            <h2 className="font-bold text-lg tracking-tight">{t("home_telemetry_title")}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("home_telemetry_desc")}
            </p>
            <Button asChild variant="secondary" className="gap-1.5 text-xs h-9">
              <Link to="/dashboard"><Activity className="h-3.5 w-3.5" /> {t("home_telemetry_btn")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <section className="relative overflow-hidden border-b">
        <div className="container py-16 md:py-20 grid lg:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">
          <div className="lg:col-span-6 space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" /> {t("home_hero_badge")}
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-500">
              Collab2Us
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-prose leading-relaxed">
              {t("home_hero_desc")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/login">{t("home_hero_cta")}</Link></Button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <Card className="shadow-lg border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Play className="h-3 w-3 text-primary" /> {t("home_demo_title")}
                  </span>
                  <Badge className="text-[9px]" variant="outline">{t("home_demo_badge")}</Badge>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="demo-input" className="text-[11px] font-bold text-muted-foreground">{t("home_demo_label")}</Label>
                  <Input 
                    id="demo-input"
                    value={demoInput}
                    onChange={(e) => setDemoInput(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <Button 
                  size="sm" 
                  onClick={runSimulation} 
                  disabled={isSimulating || !demoInput} 
                  className="w-full text-xs h-8 gap-1.5"
                >
                  {isSimulating ? t("home_demo_processing") : t("home_demo_btn")}
                </Button>

                {demoResult && (
                  <div className="border border-dashed rounded-lg p-3 bg-muted/20 space-y-2 animate-fade-in text-xs leading-relaxed">
                    <p className="font-semibold text-foreground">{demoResult.title}</p>
                    <pre className="font-sans text-[10px] bg-background p-2 rounded border mt-1 whitespace-pre-wrap text-muted-foreground">
                      {demoResult.desc}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}