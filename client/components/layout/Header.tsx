import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

//Componente Cabeçalho:
export default function Header() {
  const { user, logout, loading: authLoading } = useAuth();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  //Debug para verificar o user e userId:
  //console.log("Header - user object:", user);
  //console.log("Header - userId (from user?.id || ''):", user?.id || '');

  const userId = user?.id || ""; //userId
  const googleHref = `/api/auth/google/start?${new URLSearchParams({ chain: 'all', userId }).toString()}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          {/* <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-cyan-500" /> */}
          <img src="/favicon.ico" alt="Collab2Us Icon" className="h-8 w-8 rounded-md border"/>
          <span className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-500">Collab2Us</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/" className={cn("transition-colors hover:text-foreground/80", isActive("/") ? "text-foreground" : "text-foreground/60")}>Início</Link>
          <Link to="/boards" className={cn("transition-colors hover:text-foreground/80", isActive("/boards") ? "text-foreground" : "text-foreground/60")}>Quadros</Link>
          <Link to="/stories" className={cn("transition-colors hover:text-foreground/80", isActive("/stories") ? "text-foreground" : "text-foreground/60")}>Histórias</Link>
          <Link to="/settings" className={cn("transition-colors hover:text-foreground/80", isActive("/settings") ? "text-foreground" : "text-foreground/60")}>Configurações</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-muted-foreground">Olá, {user.name.split(" ")[0]}{user.provider === 'google' ? ' (via Google)' : ''}</span>
              <Button variant="outline" onClick={() => logout()}>Sair</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost"><Link to="/login">Entrar</Link></Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
