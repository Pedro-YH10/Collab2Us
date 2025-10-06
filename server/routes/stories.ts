import { RequestHandler } from "express";
import { getFormattedMiroStories } from "../services/conversion";
import { getToken } from "../models/tokens";

//Analisar uma história de usuário:
function analyze(text: string) {
  const cleaned = (text || "").trim();
  const hasRole = /Como\s+[^,]+/i.test(cleaned);
  const hasGoal = /quero\s+[^,]+/i.test(cleaned);
  const hasReason = /para\s+.+/i.test(cleaned);
  const criteria = cleaned.match(/^(Given|When|Then|Aceit|Crit[eé]rios)/gim)?.length || 0;
  const length = cleaned.split(/\s+/).length;
  //const score = Math.min(100, (hasRole ? 25 : 0) + (hasGoal ? 25 : 0) + (hasReason ? 10 : 0) + Math.min(30, criteria * 10) + (length > 8 ? 10 : 0));
  const score = Math.min(100, (hasRole ? 25 : 0) + (hasGoal ? 40 : 0) + (hasReason ? 25 : 0) + (length > 8 ? 10 : 0));
  const suggestions: string[] = [];
  if (!hasRole) suggestions.push("Inclua o papel do usuário (Como [tipo de usuário])");
  if (!hasGoal) suggestions.push("Inclua o objetivo (quero [ação/resultado])");
  if (!hasReason) suggestions.push("Inclua o motivo (para [benefício])");
  //if (criteria < 2) suggestions.push("Adicione critérios de aceitação (Given/When/Then)");
  return { score, suggestions, criteria };
}

//Rota de analisar uma história de usuário:
export const analyzeStory: RequestHandler = (req, res) => {
  const { text } = (req.body || {}) as { text: string };
  if (!text) return res.status(400).json({ error: "Informe o texto" });
  return res.status(200).json(analyze(text));
};

//Rota de pré visualização das histórias de usuário de um quadro do Miro:
export const previewMiroStories: RequestHandler = async (req, res) => {
  try {
    const userId = (req.header("X-User-Id") as string) || (req.query.userId as string) || "";
    if (!userId) return res.status(401).json({ error: "Usuário não autenticado." });

    const { miroBoardId, template } = req.body as { miroBoardId: string; template: "userStory" | "raw" };
    if (!miroBoardId) return res.status(400).json({ error: "ID do quadro Miro é obrigatório." });

    const miroT = await getToken(userId, "miro");
    if (!miroT) return res.status(401).json({ error: "Token do Miro não encontrado." });

    const formattedStories = await getFormattedMiroStories(miroBoardId, {
      template: template || "userStory",
      miroToken: miroT.access_token,
    });

    res.status(200).json({ stories: formattedStories });
  } catch (e: any) {
    console.error("Erro ao pré-visualizar histórias do Miro:", e);
    res.status(500).json({ error: e.message || "Erro interno ao pré-visualizar histórias do Miro." });
  }
};
