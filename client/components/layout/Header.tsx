import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";
import { 
  Menu, 
  LogOut, 
  Settings, 
  Activity, 
  Layers, 
  FolderKanban, 
  Workflow as WorkflowIcon,
  Home,
  BookOpen,
  Globe
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export default function Header() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", label: t("nav_home"), icon: Home },
    { path: "/boards", label: t("nav_boards"), icon: FolderKanban },
    { path: "/stories", label: t("nav_stories"), icon: Layers },
    { path: "/dashboard", label: t("nav_dashboard"), icon: Activity },
    { path: "/workflow", label: t("nav_workflow"), icon: WorkflowIcon },
    { path: "/references", label: t("nav_references"), icon: BookOpen }
  ];

  const userInitials = user?.name 
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() 
    : "US";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        
        <Link to="/" className="flex items-center gap-2.5 transition-transform duration-200 active:scale-95">
          <img src="/favicon.ico" alt="Collab2Us Icon" className="h-8 w-8 rounded-md border shadow-xs" />
          <span className="text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-500">
            Collab2Us
          </span>
        </Link>

        {/* Menu Desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative py-1.5 transition-colors duration-200 text-sm font-medium",
                "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-primary after:origin-bottom-left after:transition-transform after:duration-300",
                isActive(item.path) 
                  ? "text-foreground after:scale-x-100" 
                  : "text-foreground/60 hover:text-foreground/90 after:scale-x-0"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Controles de Idioma e Usuário */}
        <div className="flex items-center gap-2">
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-semibold gap-1 border">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="uppercase">{language}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => setLanguage("en")} className="text-xs cursor-pointer">
                🇺🇸 English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("pt")} className="text-xs cursor-pointer">
                🇧🇷 Português
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage("es")} className="text-xs cursor-pointer">
                🇪🇸 Español
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <div className="flex items-center gap-2.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full select-none cursor-pointer">
                    <Avatar className="h-9 w-9 border">
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mt-1.5" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs font-bold truncate">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer text-xs">
                    <Link to="/settings" className="flex items-center w-full">
                      <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{t("nav_settings")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer text-xs">
                    <Link to="/workflow" className="flex items-center w-full">
                      <WorkflowIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{t("nav_workflow")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-xs text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("nav_logout")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button asChild size="sm" className="h-9 text-xs"><Link to="/login">{t("nav_login")}</Link></Button>
          )}

          {/* Menu Mobile */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0 flex flex-col justify-between">
              <div>
                <div className="p-6 border-b">
                  <span className="text-sm font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-500">
                    {t("nav_menu_title")}
                  </span>
                </div>
                <nav className="flex flex-col p-4 gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SheetClose asChild key={item.path}>
                        <Link
                          to={item.path}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors",
                            isActive(item.path) ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-accent/40"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </div>
    </header>
  );
}