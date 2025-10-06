import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Board, BoardsResponse } from "@shared/api";
import { Button } from "@/components/ui/button";
import { BoardSearchBar, type SortOption } from "@/components/boards/BoardSearchBar";
import { BoardActions } from "@/components/boards/BoardActions";
import { useAuth } from "@/lib/auth-context";

//Buscar os dados do usuário:
async function fetchJSON<T>(url: string, userId?: string): Promise<T> {
  const res = await fetch(url, { headers: userId ? { "X-User-Id": userId } : undefined });
  if (!res.ok) throw new Error("Erro ao buscar dados");
  return res.json();
}

//Página Quadros:
export default function Boards() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("name-asc");

  const miro = useQuery({ queryKey: ["miro-boards", userId], queryFn: () => fetchJSON<BoardsResponse>("/api/miro/boards", userId), enabled: !!userId });
  const trello = useQuery({ queryKey: ["trello-boards", userId], queryFn: () => fetchJSON<BoardsResponse>("/api/trello/boards", userId), enabled: !!userId });

  function refetchAll() {
    qc.invalidateQueries({ queryKey: ["miro-boards", userId] });
    qc.invalidateQueries({ queryKey: ["trello-boards", userId] });
  }

  const filterSort = (items?: Board[]) => {
    const q = query.trim().toLowerCase();
    const filtered = (items || []).filter((b) => (q ? b.name.toLowerCase().includes(q) : true));
    const sorted = [...filtered].sort((a, b) => {
      const na = a.name.toLowerCase();
      const nb = b.name.toLowerCase();
      if (sort === "name-asc") return na.localeCompare(nb);
      return nb.localeCompare(na);
    });
    return sorted;
  };

  const miroBoards = useMemo(() => filterSort(miro.data?.boards), [miro.data, query, sort]);
  const trelloBoards = useMemo(() => filterSort(trello.data?.boards), [trello.data, query, sort]);

  return (
    <div className="container py-10">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seus Quadros</h1>
          <p className="text-muted-foreground">Visualize, pesquise, organize e gerencie quadros do Miro e Trello</p>
        </div>
        <div className="flex gap-2">
          <a href="/settings"><Button>Conectar contas</Button></a>
          <Button variant="outline" onClick={refetchAll}>Atualizar</Button>
        </div>
      </div>

      <div className="mt-6">
        <BoardSearchBar value={query} onChange={setQuery} sort={sort} onSortChange={setSort} />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <BoardList
          title="Miro"
          loading={miro.isLoading}
          error={miro.isError}
          boards={miroBoards}
          onUpdated={refetchAll}
          onDeleted={refetchAll}
          trelloBoards={trello.data?.boards}
          userId={userId || ""}
        />
        <BoardList
          title="Trello"
          loading={trello.isLoading}
          error={trello.isError}
          boards={trelloBoards}
          onUpdated={refetchAll}
          onDeleted={refetchAll}
          userId={userId || ""}
        />
      </div>
    </div>
  );
}

//Listar os quadros:
function BoardList({ title, loading, error, boards, onUpdated, onDeleted, trelloBoards, userId }: { title: string; loading: boolean; error: boolean; boards?: Board[]; onUpdated: () => void; onDeleted: () => void; trelloBoards?: Board[]; userId: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {loading && <p className="text-muted-foreground">Carregando...</p>}
      {error && <p className="text-destructive">Erro ao carregar</p>}
      <div className="grid gap-3">
        {boards?.map((b) => (
          <div key={b.id} className="group rounded-md border p-3 hover:bg-accent/40 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block truncate cursor-pointer" onClick={() => window.open(b.url, '_blank')}>
                  <p className="font-medium group-hover:text-foreground truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground truncate">ID: {b.id}</p>
                </span>
              </div>
              <span className="text-xs rounded-full border px-2 py-1 text-muted-foreground">{b.source}</span>
              <BoardActions userId={userId} board={b} onUpdated={onUpdated} onDeleted={onDeleted} trelloBoards={trelloBoards} />
            </div>
          </div>
        ))}
        {!loading && boards && boards.length === 0 && <p className="text-sm text-muted-foreground">Nenhum resultado</p>}
      </div>
    </div>
  );
}
