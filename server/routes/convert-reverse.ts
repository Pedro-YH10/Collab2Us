import { RequestHandler } from "express";
import * as Trello from "../services/trello";
import * as Miro from "../services/miro";
import { getToken } from "../models/tokens";

//Rota de converter histórias de usuário do Trello para o Miro(Funcionalidade ainda não feita, mas talvez será feita no futuro):
export const convertTrelloToMiro: RequestHandler = async (req, res) => {
  const { trelloBoardId, miroBoardId } = (req.body || {}) as { trelloBoardId: string; miroBoardId: string };
  if (!trelloBoardId || !miroBoardId) return res.status(400).json({ error: "Informe trelloBoardId e miroBoardId" });
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const miroT = userId ? await getToken(userId, "miro") : null;
    const trelloT = userId ? await getToken(userId, "trello") : null;

    const cards = await Trello.listBoardCards(trelloBoardId, trelloT?.access_token || undefined);
    let created = 0;
    const details: string[] = [];
    for (const c of cards) {
      const text = `${c.name}\n\n${c.desc || ""}`.trim();
      await Miro.createSticky(miroBoardId, text, miroT?.access_token || undefined);
      created++;
      details.push(`Sticky criado: ${c.name}`);
    }
    res.status(200).json({ status: "ok", created, details });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};
