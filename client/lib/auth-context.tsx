import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthResponse, User } from "@shared/api";

//Valores de AuthContext:
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: { name?: string; email?: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

//Criar AuthContext:
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

//Função de Login, Registrar, Logout, Atualizar Usuário e Deletar Conta:
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("c2u:user");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async login(email, password) {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Falha no login");
      }
      const data = (await res.json()) as AuthResponse;
      setUser(data.user);
      localStorage.setItem("c2u:user", JSON.stringify(data.user));
    },
    async register(name, email, password) {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Falha no cadastro");
      }
      const data = (await res.json()) as AuthResponse;
      setUser(data.user);
      localStorage.setItem("c2u:user", JSON.stringify(data.user));
    },
    async logout() {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      setUser(null);
      localStorage.removeItem("c2u:user");
    },
    async updateUser(data: { name?: string; email?: string }) {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Falha ao atualizar o usuário");
      }
      const updatedData = (await res.json()) as { user: User };
      setUser(updatedData.user);
      localStorage.setItem("c2u:user", JSON.stringify(updatedData.user));
    },
    async deleteAccount() {
      if (!user?.id) throw new Error("Usuário não autenticado.");
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        headers: { "X-User-Id": user.id },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Falha ao excluir a conta");
      }
      await value.logout(); //Desloga após deletar
      window.location.href = "/login"; //Redireciona para login
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

//Usar Auth:
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro do AuthProvider");
  return ctx;
}
