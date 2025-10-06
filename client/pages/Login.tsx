import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

//Página Login:
export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Acesse o Collab2Us</h1>
          <p className="text-muted-foreground">Crie sua conta ou entre com suas credenciais</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <LoginForm onSubmit={async (email, password) => {
                try {
                  await login(email, password);
                  toast.success("Login realizado");
                  navigate("/");
                } catch (e: any) {
                  toast.error(e.message);
                }
              }} />
            </TabsContent>
            <TabsContent value="register" className="mt-6">
              <RegisterForm onSubmit={async (name, email, password) => {
                try {
                  await register(name, email, password);
                  toast.success("Cadastro realizado");
                  navigate("/");
                } catch (e: any) {
                  toast.error(e.message);
                }
              }} />
            </TabsContent>
          </Tabs>
          <div className="mt-6">
            <a href="/api/auth/google/start" className="w-full inline-flex"><Button className="w-full">Continuar com Google</Button></a>
            <p className="mt-2 text-xs text-muted-foreground">Após conectar com Google, conectaremos suas contas do Miro e Trello.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSubmit }: { onSubmit: (email: string, password: string) => void | Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(email, password); }}>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full">Entrar</Button>
    </form>
  );
}

function RegisterForm({ onSubmit }: { onSubmit: (name: string, email: string, password: string) => void | Promise<void> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(name, email, password); }}>
      <div className="grid gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full">Criar conta</Button>
    </form>
  );
}
