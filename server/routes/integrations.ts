import { RequestHandler } from "express";
import { getToken } from "../models/tokens";

//Rota de pegar os Tokens do Google, Miro e Trello:
export const getTokenInfo: RequestHandler = async (req, res) => {
  const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
  const provider = (req.query.provider as string) as "google" | "miro" | "trello";
  if (!userId || !provider) return res.status(400).json({ error: "Informe userId e provider" });
  const row = await getToken(userId, provider);
  if (!row) return res.status(200).json({ provider, hasToken: false });
  return res.status(200).json({ provider, hasToken: true, token: row.access_token });
};
