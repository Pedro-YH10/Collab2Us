import { http } from "./http";

const API = "https://api.trello.com/1";

function creds(tokenOverride?: string) {
  const key = process.env.TRELLO_KEY;
  const token = tokenOverride || process.env.TRELLO_TOKEN;
  if (!key || !token) throw new Error("Credenciais do Trello ausentes no ambiente.");
  return { key, token };
}

export async function listBoards(tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const boards = await http<any[]>(`${API}/members/me/boards?key=${key}&token=${token}&fields=name,url`);
  return boards.map((b) => ({ id: b.id, name: b.name, url: b.url }));
}

export async function searchBoards(query: string, tokenOverride?: string) {
  const boards = await listBoards(tokenOverride);
  const q = query.trim().toLowerCase();
  return boards.filter((b) => b.name.toLowerCase().includes(q));
}

export async function updateBoardName(boardId: string, name: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const params = new URLSearchParams({ key, token, name });
  return await http<any>(`${API}/boards/${boardId}?${params.toString()}`, { method: "PUT" });
}

export async function deleteBoard(boardId: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  return await http<any>(`${API}/boards/${boardId}?key=${key}&token=${token}`, { method: "DELETE" });
}

export async function getBoardLists(boardId: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  return await http<any[]>(`${API}/boards/${boardId}/lists?key=${key}&token=${token}`);
}

export async function createList(boardId: string, name: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const params = new URLSearchParams({ key, token, idBoard: boardId, name });
  return await http<any>(`${API}/lists?${params.toString()}`, { method: "POST" });
}

export async function createCard(listId: string, name: string, desc?: string, labels?: string[], tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const params = new URLSearchParams({ key, token, idList: listId, name, desc: desc || "" });
  return await http<any>(`${API}/cards?${params.toString()}`, { method: "POST" });
}

export async function addCardAttachment(cardId: string, url: string, name?: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const params = new URLSearchParams({ key, token, url, name: name || "Quadro do Miro" });
  return await http<any>(`${API}/cards/${cardId}/attachments?${params.toString()}`, { method: "POST" });
}

export async function listBoardCards(boardId: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  return await http<any[]>(`${API}/boards/${boardId}/cards?key=${key}&token=${token}&fields=name,desc,labels,url,idList`);
}

export async function getBoardMembers(boardId: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  return await http<any[]>(`${API}/boards/${boardId}/members?key=${key}&token=${token}`);
}

export async function getCardById(cardId: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  return await http<any>(`${API}/cards/${cardId}?key=${key}&token=${token}&fields=name,desc,url,closed`);
}

export async function updateCard(cardId: string, name?: string, desc?: string, idList?: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const params = new URLSearchParams({ key, token });
  if (name !== undefined) params.set("name", name);
  if (desc !== undefined) params.set("desc", desc);
  if (idList !== undefined) params.set("idList", idList);
  return await http<any>(`${API}/cards/${cardId}?${params.toString()}`, { method: "PUT" });
}

export async function archiveCard(cardId: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const params = new URLSearchParams({ key, token, closed: "true" });
  return await http<any>(`${API}/cards/${cardId}?${params.toString()}`, { method: "PUT" });
}

export async function addCardComment(cardId: string, text: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const params = new URLSearchParams({ key, token, text });
  return await http<any>(`${API}/cards/${cardId}/actions/comments?${params.toString()}`, { method: "POST" });
}

export async function createBoard(name: string, tokenOverride?: string) {
  const { key, token } = creds(tokenOverride);
  const params = new URLSearchParams({ key, token, name, defaultLists: "true" });
  return await http<any>(`${API}/boards/?${params.toString()}`, { method: "POST" });
}