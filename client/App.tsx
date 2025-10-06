import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Boards from "./pages/Boards";
import Stories from "./pages/Stories";
import Settings from "./pages/Settings";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RequireAuth from "@/components/layout/RequireAuth";
import { AuthProvider } from "@/lib/auth-context";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Header />
          <main className="min-h-[calc(100vh-8rem)]">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/boards" element={<RequireAuth><Boards /></RequireAuth>} />
              <Route path="/stories" element={<RequireAuth><Stories /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              {/* Todas as rotas tem que estar acima da Rota "*" */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
