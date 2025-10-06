import { http } from "./http";

const API = "https://api.trello.com/1";

//Credenciais:
function creds(tokenOverride?: string) {
  const key = process.env.TRELLO_KEY;
  const token = tokenOverride || process.env.TRELLO_TOKEN;
  if (!key || !token) throw new Error("Coloque o TRELLO_KEY e um token do Trello(Se conecte ou coloque manualmente)");
  return { key, token };
}

//Listar quadros:
export async function listBoards(tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const boards = await http<any[]>(`${API}/members/me/boards?key=${key}&token=${token}&fields=name,url`);
  return boards.map((b) => ({ id: b.id, name: b.name, url: b.url }));
}

//Buscar quadros:
export async function searchBoards(query: string, tokenOverride?: string) {
  const boards = await listBoards(tokenOverride);
  const q = query.trim().toLowerCase();
  return boards.filter((b) => b.name.toLowerCase().includes(q));
}

//Atualizar nome de um quadro:
export async function updateBoardName(boardId: string, name: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const params = new URLSearchParams({ key, token, name });
  return await http<any>(`${API}/boards/${boardId}?${params.toString()}`, { method: "PUT" });
}

//Deletar um quadro:
export async function deleteBoard(boardId: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  return await http<any>(`${API}/boards/${boardId}?key=${key}&token=${token}`, { method: "DELETE" });
}

//Listar todas as listas de um quadro:
export async function getBoardLists(boardId: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  return await http<any[]>(`${API}/boards/${boardId}/lists?key=${key}&token=${token}`);
}

//Criar uma lista em um quadro:
export async function createList(boardId: string, name: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const params = new URLSearchParams({ key, token, idBoard: boardId, name });
  return await http<any>(`${API}/lists?${params.toString()}`, { method: "POST" });
}

//Criar um card em um quadro:
export async function createCard(listId: string, name: string, desc?: string, labels?: string[], tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const params = new URLSearchParams({ key, token, idList: listId, name, desc: desc || "" });
  return await http<any>(`${API}/cards?${params.toString()}`, { method: "POST" });
}

//Listar todos os cards de um quadro:
export async function listBoardCards(boardId: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  return await http<any[]>(`${API}/boards/${boardId}/cards?key=${key}&token=${token}&fields=name,desc,labels,url`);
}
