import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/i18n-context";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle2, AlertCircle, Home, FolderKanban, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { user, updateUser, deleteAccount } = useAuth();
  const { t } = useTranslation();
  
  const [userName, setUserName] = useState(user?.name || "");
  const [userEmail, setUserEmail] = useState(user?.email || "");
  const [userPassword, setUserPassword] = useState("");

  useEffect(() => {
    if (user?.name) setUserName(user.name);
    if (user?.email) setUserEmail(user.email);
  }, [user?.name, user?.email]);

  const saveToken = async (provider: "miro" | "trello", token: string) => {
    const res = await fetch("/api/integrations/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, access_token: token }),
    });
    if (!res.ok) throw new Error("Failed to save token");
  };

  const [miroToken, setMiroToken] = useState("");
  const [trelloToken, setTrelloToken] = useState("");
  const [miroValid, setMiroValid] = useState(false);
  const [trelloValid, setTrelloValid] = useState(false);

  const [showMiro, setShowMiro] = useState(false);
  const [showTrello, setShowTrello] = useState(false);
  
  async function loadTokens() {
    for (const p of ["miro", "trello"]) {
      const res = await fetch(`/api/integrations/token?provider=${p}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (p === "miro") {
          setMiroToken(data.token || "");
          setMiroValid(Boolean(data.isValid));
        }
        if (p === "trello") {
          setTrelloToken(data.token || "");
          setTrelloValid(Boolean(data.isValid));
        }
      }
    }
  }

  useEffect(() => { loadTokens(); }, []);

  const handleUpdateProfile = async () => {
    try {
      const payload: { name?: string; email?: string; password?: string } = {};
      if (userName.trim() !== user?.name) payload.name = userName.trim();
      if (userEmail.trim().toLowerCase() !== user?.email) payload.email = userEmail.trim().toLowerCase();
      if (userPassword.trim()) payload.password = userPassword.trim();

      if (Object.keys(payload).length === 0) return;

      await updateUser(payload);
      setUserPassword("");
      toast.success(t("toast_profile_updated"));
    } catch (error: any) {
      toast.error(error.message || t("toast_profile_error"));
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      toast.success(t("toast_account_deleted"));
    } catch (error: any) {
      toast.error(error.message || t("toast_account_delete_error"));
    }
  };

  const profileHasChanges = userName !== user?.name || userEmail !== user?.email || userPassword.trim().length > 0;

  return (
    <div className="container py-10 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("st_title")}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{t("st_subtitle")}</p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-xl border bg-card p-5 grid gap-4">
          <h2 className="font-semibold text-sm">{t("st_profile_title")}</h2>
          
          <div className="grid gap-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("st_name")}</Label>
            <Input value={userName} onChange={(e) => setUserName(e.target.value)} className="text-xs h-9" />
          </div>

          <div className="grid gap-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("st_email")}</Label>
            <Input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className="text-xs h-9" />
          </div>

          <div className="grid gap-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("st_new_password")}</Label>
            <Input
              type="password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              placeholder={t("st_password_placeholder")}
              autoComplete="new-password"
              className="text-xs h-9"
            />
          </div>

          <div className="pt-2">
            <Button onClick={handleUpdateProfile} disabled={!profileHasChanges} size="sm" className="text-xs h-9">
              {t("st_save_profile")}
            </Button>
          </div>
        </div>

        {/* Botão de Conexão Unificada */}
        <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5 text-center sm:text-left">
            <p className="font-bold text-xs text-primary flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> {t("st_connect_both_btn")}
            </p>
            <p className="text-[11px] text-muted-foreground">{t("st_connect_both_desc")}</p>
          </div>
          <Button asChild size="sm" className="h-8 text-xs font-semibold gap-1.5 whitespace-nowrap bg-primary text-primary-foreground">
            <a href="/api/auth/miro/start?chain=trello">
              <Sparkles className="h-3 w-3" /> {t("st_connect_both_btn")}
            </a>
          </Button>
        </div>

        <TokenCard
          name="Miro"
          start="/api/auth/miro/start"
          value={miroToken}
          isValid={miroValid}
          show={showMiro}
          onToggleShow={() => setShowMiro((s) => !s)}
          onChange={setMiroToken}
          onSave={async (token) => { 
            await saveToken("miro", token); 
            await loadTokens(); 
            toast.success(t("toast_token_saved", { provider: "Miro" })); 
          }}
        />

        <TokenCard
          name="Trello"
          start="/api/auth/trello/start"
          value={trelloToken}
          isValid={trelloValid}
          show={showTrello}
          onToggleShow={() => setShowTrello((s) => !s)}
          onChange={setTrelloToken}
          onSave={async (token) => { 
            await saveToken("trello", token); 
            await loadTokens(); 
            toast.success(t("toast_token_saved", { provider: "Trello" })); 
          }}
        />

        <div className="rounded-xl border bg-card p-5 grid gap-4 bg-red-50/10 dark:bg-red-950/20 border-red-200/40">
          <h2 className="font-semibold text-sm text-destructive">{t("st_delete_title")}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">{t("st_delete_desc")}</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="text-xs h-9 w-fit">{t("st_delete_btn")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("st_delete_confirm_title")}</AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  {t("st_delete_confirm_desc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs">{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs">
                  {t("st_delete_confirm_btn")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function TokenCard({ name, start, value, onChange, onSave, show, onToggleShow }: { 
  name: string;
  start: string;
  value?: string;
  isValid?: boolean;
  onChange?: (v: string) => void;
  onSave: (token: string) => Promise<void>;
  show: boolean;
  onToggleShow: () => void
}) {
  const { t } = useTranslation();
  const [token, setToken] = useState(value || "");
  useEffect(() => { if (typeof value === 'string') setToken(value); }, [value]);
  const isConnected = Boolean(token && token.trim().length > 0);

  return (
    <div className="rounded-xl border bg-card p-5 grid gap-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm">{name}</p>
          {isConnected ? (
            <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-300 bg-emerald-50/10">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {t("st_status_connected")}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground border-dashed">
              <AlertCircle className="h-3 w-3 text-amber-500" /> {t("st_status_disconnected")}
            </Badge>
          )}
        </div>
        <a href={start}><Button size="sm" className="text-xs">{t("st_oauth_connect")}</Button></a>
      </div>
      <div className="grid gap-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("st_token_label")} ({name})</Label>
        <div className="flex gap-2">
          <Input 
            type={show ? "text" : "password"} 
            value={token} 
            onChange={(e) => { setToken(e.target.value); onChange?.(e.target.value); }} 
            placeholder={`${t("st_token_placeholder")} ${name}`} 
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            name={`api-token-${name.toLowerCase()}`}
            className="text-xs h-9"
          />
        </div>
      </div>
      <div>
        <Button variant="outline" size="sm" onClick={() => onSave(token)} disabled={!token} className="text-xs">
          {t("st_save_token_manual")}
        </Button>
      </div>
    </div>
  );
}