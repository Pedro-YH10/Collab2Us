import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthResponse, User } from "@shared/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: { name?: string; email?: string; password?: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch("/api/users/current", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async login(email, password) {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include"
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Falha ao realizar login. Verifique as credenciais.");
      }
      const data = (await res.json()) as AuthResponse;
      setUser(data.user);
    },
    async register(name, email, password) {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
        credentials: "include"
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Falha ao processar o cadastro.");
      }
      const data = (await res.json()) as AuthResponse;
      setUser(data.user);
    },
    async logout() {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
      setUser(null);
    },
    async updateUser(data: { name?: string; email?: string; password?: string }) {
      if (!user) return;
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      
      if (res.status === 401) {
        setUser(null);
        window.location.href = "/login?session_expired=true";
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Falha ao atualizar o usuário.");
      }
      const updatedData = (await res.json()) as { user: User };
      setUser(updatedData.user);
    },
    async deleteAccount() {
      if (!user) return;
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (res.status === 401) {
        setUser(null);
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Falha ao excluir a conta.");
      }
      setUser(null);
      window.location.href = "/login";
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro do AuthProvider");
  return ctx;
}