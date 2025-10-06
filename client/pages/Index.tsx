import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

//Página Início(Home):
export default function Index() {
  const { user } = useAuth();

  return (
    <div className="bg-gradient-to-br from-background via-background to-background">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute -top-16 -left-16 h-72 w-72 rounded-full bg-primary blur-3xl" />
          <div className="absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-cyan-500 blur-3xl" />
        </div>
        <div className="container py-10 md:py-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-500">
              Collab2Us
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-prose">
              Torne sua engenharia de software mais eficiente. Conecte seus quadros do Miro e do Trello e converta post-its em histórias de usuário no Kanban com um clique. Sincronização bidirecional, organização inteligente e visual moderno.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/boards">Ver Quadros</Link></Button>
              {!user && (
                <Button asChild size="lg" variant="outline"><Link to="/login">Criar conta / Entrar</Link></Button>
              )}
            </div>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Feature title="Miro → Trello" desc="Converta post-its em cartões de história" />
              <Feature title="Trello → Miro" desc="Leve o Kanban para ideação visual" />
              <Feature title="Sincronização" desc="Mantém tudo atualizado automaticamente" />
            </div>
          </div>
          <div className="relative">
            <div className="rounded-xl border bg-card p-4 shadow-xl">
              <div className="w-96 h-72 w-full rounded-lg bg-gradient-to-br from-primary/15 to-cyan-400/15 grid place-items-center">
                <img src="/images/Image1.svg" alt="Logo Collab2Us" className="max-w-full max-h-full object-contain"/>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <p className="font-semibold">Post-its</p>
                  <p className="text-muted-foreground">Descoberta visual</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="font-semibold">Histórias</p>
                  <p className="text-muted-foreground">Prontas para o Kanban</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 md:py-16">
        <h2 className="text-2xl font-bold tracking-tight">Como funciona</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Step n={1} title="Conecte contas" desc="Acesse com Google e vincule Miro e Trello" />
          <Step n={2} title="Escolha quadros" desc="Selecione o quadro do Miro e o do Trello" />
          <Step n={3} title="Converta" desc="Geramos as histórias de usuário automaticamente" />
        </div>
      </section>
    </div>
  );
}

//Componente de Feature:
function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="font-semibold">{title}</p>
      <p className="text-muted-foreground">{desc}</p>
    </div>
  );
}

//Componente de Etapa:
function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-cyan-500 text-white grid place-items-center font-bold">{n}</div>
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-muted-foreground">{desc}</p>
    </div>
  );
}
