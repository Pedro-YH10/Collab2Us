import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

// Função de redirecionamento para rota Login se caso o usuário não estiver autenticado
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
