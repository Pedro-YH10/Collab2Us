import { RequestHandler } from "express";
import * as Miro from "../services/miro";
import { getToken } from "../models/tokens";

//Rota de pegar os sticky notes do Miro:
export const getMiroNotes: RequestHandler = async (req, res) => {
  const boardId = (req.query.boardId as string) || "";
  if (!boardId) return res.status(400).json({ error: "Informe boardId" });
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const t = userId ? await getToken(userId, "miro") : null;
    const notes = await Miro.listStickyNotes(boardId, t?.access_token || undefined);
    res.status(200).json({ notes });
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
};
