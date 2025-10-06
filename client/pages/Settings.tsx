import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

//Página Configurações:
export default function Settings() {
  const { user, updateUser, deleteAccount, logout, loading: authLoading } = useAuth();
  const userId = user?.id || "";
  const [userName, setUserName] = useState(user?.name || "");

  //console.log("Settings Page - user:", user); //Debug
  //console.log("Settings Page - userId:", userId); //Debug

  useEffect(() => {
    if (user?.name) setUserName(user.name);
  }, [user?.name]);

  //Função de salvar um Token:
  const saveToken = async (provider: "miro" | "trello", token: string) => {
    const res = await fetch("/api/integrations/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": userId },
      body: JSON.stringify({ provider, access_token: token }),
    });
    if (!res.ok) throw new Error("Falha ao salvar token");
  };

  const startGoogleAll = `/api/auth/google/start?chain=all&userId=${encodeURIComponent(userId)}`;
  const startMiro = `/api/auth/miro/start?userId=${encodeURIComponent(userId)}`;
  const startTrello = `/api/auth/trello/start?userId=${encodeURIComponent(userId)}`;

  const [miroToken, setMiroToken] = useState("");
  const [trelloToken, setTrelloToken] = useState("");
  const [showMiro, setShowMiro] = useState(false);
  const [showTrello, setShowTrello] = useState(false);

  //Debug
  const [miroBoardIdForDebug, setMiroBoardIdForDebug] = useState(""); //boardId debug
  const handleDebugMiro = async () => {
    if (!userId) {
      toast.error("Usuário não autenticado.");
      return;
    }
    if (!miroBoardIdForDebug) {
      toast.error("Por favor, insira um Board ID do Miro para depuração.");
      return;
    }

    try {
      const response = await fetch(`/api/miro/debug/items?boardId=${encodeURIComponent(miroBoardIdForDebug)}`, {
        headers: { "X-User-Id": userId },
      });
      if (!response.ok) throw new Error(`Erro ${response.status}: ${await response.text()}`);

      const data = await response.json();
      console.log("Debug Miro Items Response:", data);
      toast.success("Verifique o console do navegador para a resposta do Miro.");
    } catch (error: any) {
      console.error("Debug Miro Error:", error);
      toast.error(error.message || "Erro ao depurar Miro");
    }
  };
  
  //Função de carregar um Token:
  async function loadTokens() {
    for (const p of ["miro","trello"]) {
      const res = await fetch(`/api/integrations/token?provider=${p}`, { headers: { "X-User-Id": userId } });
      if (res.ok) {
        const data = await res.json();
        if (p === "miro") setMiroToken(data.token || "");
        if (p === "trello") setTrelloToken(data.token || "");
      }
    }
  }

  useEffect(() => { if (userId) loadTokens(); }, [userId]);
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("connected")) { loadTokens(); }
    const onFocus = () => loadTokens();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [userId]);

  //Função de atualizar nome da conta:
  const handleUpdateName = async () => {
    try {
      await updateUser({ name: userName });
      toast.success("Nome atualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Falha ao atualizar o nome");
    }
  };

  //Função de deletar conta:
  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      toast.success("Conta excluída com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Falha ao excluir a conta");
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>

      {/* Mostra as informações do usuário: tipo de conta e email */}
      {user && (
        <div className="mt-4">
          {user.name && <p className="text-sm text-muted-foreground">Nome do usuário: {user.name}</p>}
          {user.email && <p className="text-sm text-muted-foreground">Email: {user.email}</p>}
          <p className="text-sm text-muted-foreground">Tipo de Conta: {user.provider ? user.provider.charAt(0).toUpperCase() + user.provider.slice(1) : 'Local'}</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 max-w-2xl">
        {/* Seção para Editar Nome */}
        <div className="rounded-xl border bg-card p-5 grid gap-4">
          <h2 className="font-semibold">Gerenciar Perfil</h2>
          <div className="grid gap-2">
            <Label htmlFor="userName">Nome</Label>
            <Input id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div>
            <Button onClick={handleUpdateName} disabled={!userName || userName === user?.name}>Salvar Nome</Button>
          </div>
        </div>

        {/* Seção de configurar o Token do Miro */}
        <TokenCard
          name="Miro"
          start={startMiro}
          value={miroToken}
          show={showMiro}
          onToggleShow={() => setShowMiro((s) => !s)}
          onChange={setMiroToken}
          onSave={async (token) => { await saveToken("miro", token); toast.success("Token do Miro salvo"); }}
        />

        {/* Seção de configurar o Token do Trello */}
        <TokenCard
          name="Trello"
          start={startTrello}
          value={trelloToken}
          show={showTrello}
          onToggleShow={() => setShowTrello((s) => !s)}
          onChange={setTrelloToken}
          onSave={async (token) => { await saveToken("trello", token); toast.success("Token do Trello salvo"); }}
        />

        {/* Seção para deletar conta */}
        <div className="rounded-xl border bg-card p-5 grid gap-4 bg-red-50 dark:bg-red-950/20">
          <h2 className="font-semibold text-destructive">Excluir Conta</h2>
          <p className="text-sm text-muted-foreground">Esta ação é irreversível. Todos os seus dados, incluindo integrações, serão permanentemente removidos.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Excluir Minha Conta</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta e removerá seus dados de nossos servidores.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar Exclusão</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>



        {/* Debug Miro */}
        {/*
        <div className="rounded-xl border bg-card p-5 grid gap-4">
          <h2 className="font-semibold">Depurar Miro Items</h2>
          <div className="grid gap-2">
            <Label htmlFor="miroBoardIdDebug">Miro Board ID para Depuração</Label>
            <Input
              id="miroBoardIdDebug"
              value={miroBoardIdForDebug}
              onChange={(e) => setMiroBoardIdForDebug(e.target.value)}
              placeholder="Cole o ID de um quadro Miro aqui"
            />
          </div>
          <div>
            <Button onClick={handleDebugMiro} disabled={!userId || !miroBoardIdForDebug || authLoading}>
              Obter Itens do Miro (Depuração)
            </Button>
          </div>
        </div>
        */}
        {/* */}

      </div>
    </div>
  );
}

//Componente de conectar:
function ProviderCard({ name, start, disabled }: { name: string; start: string | undefined; disabled: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{name}</p>
        </div>
        <a href={start}><Button disabled={disabled}>Conectar</Button></a>
      </div>
    </div>
  );
}

//Componente de campo de Token:
function TokenCard({ name, start, value, onChange, onSave, show, onToggleShow }: { name: string; start: string; value?: string; onChange?: (v: string) => void; onSave: (token: string) => Promise<void>; show: boolean; onToggleShow: () => void }) {
  const [token, setToken] = useState(value || "");
  useEffect(() => { if (typeof value === 'string') setToken(value); }, [value]);
  const type = show ? "text" : "password";
  return (
    <div className="rounded-xl border bg-card p-5 grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{name}</p>
        </div>
        <a href={start}><Button disabled={false}>Conectar</Button></a>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${name}-token`}>Token de acesso ({name})</Label>
        <div className="flex gap-2">
          <Input id={`${name}-token`} type={type} value={token} onChange={(e) => { setToken(e.target.value); onChange?.(e.target.value); }} placeholder={`Cole o token do ${name}`} />
          <Button type="button" variant="outline" onClick={onToggleShow}>{show ? "Ocultar" : "Mostrar"}</Button>
        </div>
      </div>
      <div>
        <Button variant="outline" onClick={() => onSave(token)} disabled={!token}>Salvar token manualmente</Button>
      </div>
    </div>
  );
}
