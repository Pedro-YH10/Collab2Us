import { RequestHandler } from "express";
import type { BoardsResponse } from "@shared/api";
import * as Miro from "../services/miro";
import { getToken } from "../models/tokens";

//Rota de pegar os quadros do Miro:
export const getMiroBoards: RequestHandler = async (req, res) => {
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const t = userId ? await getToken(userId, "miro") : null;
    const boards = await Miro.listBoards(t?.access_token || undefined);
    const data: BoardsResponse = { boards: boards.map((b) => ({ ...b, source: "miro" })) };
    res.status(200).json(data);
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
};

//Rota de buscar os quadros do Miro:
export const searchMiroBoards: RequestHandler = async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const t = userId ? await getToken(userId, "miro") : null;
    const boards = await Miro.searchBoards(q, t?.access_token || undefined);
    const data: BoardsResponse = { boards: boards.map((b) => ({ ...b, source: "miro" })) };
    res.status(200).json(data);
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
};

//Rota de atualizar um quadro do Miro:
export const updateMiroBoard: RequestHandler = async (req, res) => {
  const id = req.params.id;
  const { name } = req.body as { name?: string };
  if (!id || !name) return res.status(400).json({ error: "Informe id e name" });
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const t = userId ? await getToken(userId, "miro") : null;
    await Miro.updateBoardName(id, name, t?.access_token || undefined);
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

//Rota de deletar um quadro do Miro:
export const deleteMiroBoard: RequestHandler = async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Informe id" });
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const t = userId ? await getToken(userId, "miro") : null;
    await Miro.deleteBoard(id, t?.access_token || undefined);
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};


//Rotas de debug:
export const debugMiroItems: RequestHandler = async (req, res) => {
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    if (!userId) return res.status(400).json({ error: "userId é obrigatório para debug do Miro" });

    //Pegar o boardId para testar através de um parâmetro de query:
    const boardId = req.query.boardId as string;
    if (!boardId) return res.status(400).json({ error: "boardId é obrigatório na query string para debug do Miro" });

    const tokenInfo = await getToken(userId, "miro");
    if (!tokenInfo) return res.status(401).json({ error: "Token do Miro não encontrado" });

    const items = await Miro.getAllConnectors(boardId, tokenInfo.access_token);
    res.status(200).json({ items });

  } catch (e: any) {
    console.error("Erro na rota de depuração do Miro:", e);
    res.status(500).json({ error: e.message || "Erro interno ao depurar Miro" });
  }
};
