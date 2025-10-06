import { useState } from "react";
import type { Board, BoardsResponse } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

//Função de requisição put pra atualizar:
async function putJSON(url: string, body: any) {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json().catch(() => ({}));
}

//Função de deletar:
async function del(url: string) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return res.json().catch(() => ({}));
}

//Função de requisição post pra criar:
async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

//Componente Ações do Quadro:
export function BoardActions({ userId, board, onUpdated, onDeleted, trelloBoards }: { userId: string; board: Board; onUpdated: () => void; onDeleted: () => void; trelloBoards?: BoardsResponse["boards"] }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [convOpen, setConvOpen] = useState(false);
  const [targetBoard, setTargetBoard] = useState<string>("");
  const disabled = name.trim().length === 0 || name === board.name;

  const base = board.source === "miro" ? "/api/miro/boards" : "/api/trello/boards";

  //Salvar:
  async function save() {
    await fetch(`${base}/${board.id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-User-Id": userId }, body: JSON.stringify({ name }) });
    setEditing(false);
    onUpdated();
  }

  //Deletar:
  async function remove() {
    await fetch(`${base}/${board.id}`, { method: "DELETE", headers: { "X-User-Id": userId } });
    setConfirmOpen(false);
    onDeleted();
  }

  //Converter:
  async function convert() {
    if (!targetBoard) return;
    await fetch("/api/convert/miro-to-trello", { method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": userId }, body: JSON.stringify({ miroBoardId: board.id, trelloBoardId: targetBoard }) });
    setConvOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      {!editing ? (
        <>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Editar</Button>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">Excluir</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar exclusão</DialogTitle>
              </DialogHeader>
              <p>Tem certeza que deseja excluir “{board.name}”?</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                <Button variant="destructive" onClick={remove}>Excluir</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {board.source === "miro" && (
            <Dialog open={convOpen} onOpenChange={setConvOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Converter p/ Trello</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Converter para Kanban no Trello</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2">
                  <label className="text-sm">Selecione o board do Trello</label>
                  <Select value={targetBoard} onValueChange={setTargetBoard}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um board" />
                    </SelectTrigger>
                    <SelectContent>
                      {trelloBoards?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConvOpen(false)}>Cancelar</Button>
                  {/* Gerar história de usuário */}
                  <a href={targetBoard ? `/stories?miroBoardId=${board.id}&trelloBoardId=${targetBoard}` : undefined}>
                    <Button onClick={() => setConvOpen(false)} disabled={!targetBoard}>Continuar para Histórias</Button>
                  </a>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-56" />
          <Button size="sm" onClick={save} disabled={disabled}>Salvar</Button>
          <Button size="sm" variant="outline" onClick={() => { setEditing(false); setName(board.name); }}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}
