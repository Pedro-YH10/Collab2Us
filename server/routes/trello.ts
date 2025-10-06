import { RequestHandler } from "express";
import type { BoardsResponse } from "@shared/api";
import * as Trello from "../services/trello";
import { getToken } from "../models/tokens";

//Rota de pegar os quadros do Trello:
export const getTrelloBoards: RequestHandler = async (req, res) => {
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const t = userId ? await getToken(userId, "trello") : null;
    const boards = await Trello.listBoards(t?.access_token || undefined);
    const data: BoardsResponse = { boards: boards.map((b) => ({ ...b, source: "trello" })) };
    res.status(200).json(data);
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
};

//Rota de buscar os quadros do Trello:
export const searchTrelloBoards: RequestHandler = async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const t = userId ? await getToken(userId, "trello") : null;
    const boards = await Trello.searchBoards(q, t?.access_token || undefined);
    const data: BoardsResponse = { boards: boards.map((b) => ({ ...b, source: "trello" })) };
    res.status(200).json(data);
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
};

//Rota de atualizar um quadro do Trello:
export const updateTrelloBoard: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const { name } = req.body as { name?: string };
  if (!id || !name) return res.status(400).json({ error: "Informe id e name" });
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const t = userId ? await getToken(userId, "trello") : null;
    await Trello.updateBoardName(id, name, t?.access_token || undefined);
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

//Rota de deletar um quadro do Trello:
export const deleteTrelloBoard: RequestHandler = async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Informe id" });
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const t = userId ? await getToken(userId, "trello") : null;
    await Trello.deleteBoard(id, t?.access_token || undefined);
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};
