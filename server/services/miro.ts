import { http } from "./http";

const API = "https://api.miro.com/v2";

//Credenciais:
function resolveToken(override?: string) {
  const token = override || process.env.MIRO_ACCESS_TOKEN;
  if (!token) throw new Error("Token do Miro não encontrado(Se conecte ou coloque manualmente)");
  return token;
}

//Listar quadros:
export async function listBoards(accessToken?: string) {
  const token = resolveToken(accessToken);
  const data = await http<{ data: { id: string; name: string; viewLink: string }[] }>(`${API}/boards`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data.map((b) => ({ id: b.id, name: b.name, url: b.viewLink }));
}

//Buscar quadros:
export async function searchBoards(query: string, accessToken?: string) {
  const boards = await listBoards(accessToken);
  const q = query.trim().toLowerCase();
  return boards.filter((b) => b.name.toLowerCase().includes(q));
}

//Atualizar nome de um quadro:
export async function updateBoardName(boardId: string, name: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  return await http<any>(`${API}/boards/${boardId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

//Deletar um quadro:
export async function deleteBoard(boardId: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  return await http<any>(`${API}/boards/${boardId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

//Listar apenas sticky notes:
export async function listStickyNotes(boardId: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  const items = await http<{ data: any[] }>(`${API}/boards/${boardId}/items?type=sticky_note`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return items.data.map((i: any) => ({ id: i.id, text: i.data?.content || i.plainText || "", tags: i.tags?.map((t: any) => t.title) || [] }));
}

//Pegar todos os conectores:
export async function getAllConnectors(boardId: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  const data = await http<{ data: any[] }>(`${API}/boards/${boardId}/connectors`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
}

//Criar um sticky note:
export async function createSticky(boardId: string, text: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  return await http<any>(`${API}/boards/${boardId}/items`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "sticky_note", data: { content: text } }),
  });
}
