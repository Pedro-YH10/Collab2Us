import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/i18n-context";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Login() {
  const { login, register } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">{t("lg_title")}</h1>
          <p className="text-muted-foreground text-xs">{t("lg_subtitle")}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">{t("lg_tab_login")}</TabsTrigger>
              <TabsTrigger value="register">{t("lg_tab_register")}</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <LoginForm onSubmit={async (email, password) => {
                try {
                  await login(email, password);
                  navigate("/");
                  toast.success(t("toast_login_success"));
                } catch (e: any) {
                  toast.error(e.message);
                }
              }} />
            </TabsContent>
            <TabsContent value="register" className="mt-6">
              <RegisterForm onSubmit={async (name, email, password) => {
                try {
                  await register(name, email, password);
                  navigate("/");
                  toast.success(t("toast_register_success"));
                } catch (e: any) {
                  toast.error(e.message);
                }
              }} />
            </TabsContent>
          </Tabs>
          <div className="mt-6">
            <a href="/api/auth/google/start" className="w-full inline-flex"><Button className="w-full">{t("lg_google_btn")}</Button></a>
            <p className="mt-2 text-[10px] text-muted-foreground">{t("lg_google_desc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSubmit }: { onSubmit: (email: string, password: string) => void | Promise<void> }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(email, password); }}>
      <div className="grid gap-2">
        <Label htmlFor="email">{t("lg_email")}</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{t("lg_password")}</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full">{t("lg_submit_login")}</Button>
    </form>
  );
}

function RegisterForm({ onSubmit }: { onSubmit: (name: string, email: string, password: string) => void | Promise<void> }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(name, email, password); }}>
      <div className="grid gap-2">
        <Label htmlFor="name">{t("lg_name")}</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">{t("lg_email")}</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{t("lg_password")}</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full">{t("lg_submit_register")}</Button>
    </form>
  );
}