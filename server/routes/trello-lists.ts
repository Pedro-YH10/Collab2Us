import { RequestHandler } from "express";
import * as Trello from "../services/trello";
import { getToken } from "../models/tokens";

//Rota de listar as listas de um quadro do Trello:
export const getTrelloLists: RequestHandler = async (req, res) => {
  const boardId = (req.query.boardId as string) || "";
  if (!boardId) return res.status(400).json({ error: "Informe boardId" });
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const t = userId ? await getToken(userId, "trello") : null;
    const lists = await Trello.getBoardLists(boardId, t?.access_token || undefined);
    res.status(200).json({ lists });
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
};
