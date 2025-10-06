import { RequestHandler } from "express";
import type { ConvertRequest, ConvertResponse } from "@shared/api";
import { convertMiroToTrello as svcConvertMiroToTrello } from "../services/conversion";
import { getToken } from "../models/tokens";

//Rota de converter histórias de usuário do Miro para o Trello:
export const convertMiroToTrello: RequestHandler = async (req, res) => {
  const body = req.body as ConvertRequest;
  if (!body?.miroBoardId || !body?.trelloBoardId) {
    return res.status(400).json({ error: "Informe os IDs de Miro e Trello" });
  }
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    const miroT = userId ? await getToken(userId, "miro") : null;
    const trelloT = userId ? await getToken(userId, "trello") : null;
    const result = await svcConvertMiroToTrello(body.miroBoardId, body.trelloBoardId, {
      listStrategy: body.listStrategy,
      listName: body.listName,
      template: body.template,
      miroToken: miroT?.access_token,
      trelloToken: trelloT?.access_token,
    });
    const response: ConvertResponse = {
      status: "ok",
      createdCards: result.created,
      details: result.details,
    };
    res.status(200).json(response);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};
