import { Response, RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import * as Trello from "../services/trello";
import { updateCard, archiveCard } from "../services/trello";
import { getOrRefreshToken } from "../models/tokens";
import { dbQuery, hasDb } from "../db";

export const getTrelloBoards: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Sessão inválida." });

  try {
    const token = await getOrRefreshToken(userId, "trello");
    if (!token) return res.status(200).json({ boards: [] });

    const boards = await Trello.listBoards(token);
    res.status(200).json({ boards: boards.map((b) => ({ ...b, source: "trello" })) });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Erro ao consultar quadros no Trello." });
  }
};

export const searchTrelloBoards: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const q = (req.query.q as string) || "";
  if (!userId) return res.status(401).json({ error: "Sessão inválida." });

  try {
    const token = await getOrRefreshToken(userId, "trello");
    if (!token) return res.status(200).json({ boards: [] });

    const boards = await Trello.searchBoards(q, token);
    res.status(200).json({ boards: boards.map((b) => ({ ...b, source: "trello" })) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const updateTrelloBoard: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const id = req.params.id;
  const { name } = req.body as { name?: string };

  if (!userId) return res.status(401).json({ error: "Sessão inválida." });
  if (!id || !name) return res.status(400).json({ error: "Informe id e name" });

  try {
    const token = await getOrRefreshToken(userId, "trello");
    if (!token) return res.status(401).json({ error: "Conexão com o Trello não configurada." });

    await Trello.updateBoardName(id, name, token);
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteTrelloBoard: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const id = req.params.id;

  if (!userId) return res.status(401).json({ error: "Sessão inválida." });
  if (!id) return res.status(400).json({ error: "Informe id" });

  try {
    const token = await getOrRefreshToken(userId, "trello");
    if (!token) return res.status(401).json({ error: "Conexão com o Trello não configurada." });

    await Trello.deleteBoard(id, token);
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const getTrelloBoardMembers: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const boardId = req.params.id;

  if (!userId) return res.status(401).json({ error: "Sessão inválida." });
  if (!boardId) return res.status(400).json({ error: "Informe boardId" });

  try {
    const token = await getOrRefreshToken(userId, "trello");
    if (!token) return res.status(401).json({ error: "Conexão com o Trello não configurada." });

    const members = await Trello.getBoardMembers(boardId, token);
    res.status(200).json({ members });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const getTrelloBoardCards: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const boardId = req.params.id;

  if (!userId) return res.status(401).json({ error: "Sessão inválida." });
  if (!boardId) return res.status(400).json({ error: "Informe boardId" });

  try {
    const token = await getOrRefreshToken(userId, "trello");
    if (!token) return res.status(401).json({ error: "Conexão com o Trello não configurada." });

    const cards = await Trello.listBoardCards(boardId, token);
    res.status(200).json({ cards });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const updateTrelloCard: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const cardId = req.params.cardId;
  const { name, desc, idList } = req.body as { name?: string; desc?: string; idList?: string };

  if (!userId) return res.status(401).json({ error: "Sessão inválida." });
  if (!cardId) return res.status(400).json({ error: "Informe cardId." });

  try {
    const token = await getOrRefreshToken(userId, "trello");
    if (!token) return res.status(401).json({ error: "Integração do Trello inativa." });

    const updated = await updateCard(cardId, name, desc, idList, token);
    res.status(200).json({ ok: true, card: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Falha ao editar cartão." });
  }
};

export const archiveTrelloCard: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const cardId = req.params.cardId;

  if (!userId) return res.status(401).json({ error: "Sessão inválida." });
  if (!cardId) return res.status(400).json({ error: "Informe cardId" });

  try {
    const token = await getOrRefreshToken(userId, "trello");
    if (!token) return res.status(401).json({ error: "Integração do Trello inativa." });

    await archiveCard(cardId, token);

    if (hasDb) {
      await dbQuery(`delete from story_mappings where trello_card_id = $1`, [cardId]);
    }

    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Falha ao arquivar cartão." });
  }
};

export const createTrelloBoard: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name } = req.body;
  if (!userId || !name) return res.status(400).json({ error: "Nome é obrigatório." });

  try {
    const token = await getOrRefreshToken(userId, "trello");
    if (!token) return res.status(401).json({ error: "Integração do Trello ausente." });

    const board = await Trello.createBoard(name, token);
    res.status(201).json({ board });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};