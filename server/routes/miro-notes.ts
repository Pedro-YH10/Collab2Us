import { Response, RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import * as Miro from "../services/miro";
import { getOrRefreshToken } from "../models/tokens";

export const getMiroNotes: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const boardId = (req.query.boardId as string) || "";

  if (!userId) return res.status(401).json({ error: "Sessão inválida." });
  if (!boardId) return res.status(400).json({ error: "Informe boardId" });

  try {
    const token = await getOrRefreshToken(userId, "miro");
    if (!token) return res.status(401).json({ error: "Conexão com o Miro não encontrada." });

    const notes = await Miro.listStickyNotes(boardId, token);
    res.status(200).json({ notes });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Erro ao consultar notas adesivas." });
  }
};