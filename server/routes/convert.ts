import { Response, RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getOrRefreshToken } from "../models/tokens";
import { getFormattedMiroStories, persistCuratedStories, checkOnDemandSync, applySyncPull, CuratedStory } from "../services/conversion";
import type { Language } from "../services/ai";

export const previewMiroStories: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { 
    miroBoardId, 
    conversionType, 
    templateFormat, 
    customTemplateText,
    language 
  } = req.query as { 
    miroBoardId?: string; 
    conversionType?: "auto" | "grafo" | "espacial" | "standalone";
    templateFormat?: "connextra" | "jtbd" | "custom" | "raw";
    customTemplateText?: string;
    language?: Language;
  };
  const userId = req.user?.id;

  if (!userId || !miroBoardId) {
    return res.status(400).json({ error: "Miro board ID and authentication are required." });
  }

  try {
    const miroToken = await getOrRefreshToken(userId, "miro");
    if (!miroToken) return res.status(401).json({ error: "Active Miro integration not found." });

    const stories = await getFormattedMiroStories(
      miroBoardId, 
      miroToken, 
      conversionType || "auto",
      templateFormat || "connextra",
      customTemplateText,
      language || "en"
    );
    res.status(200).json({ stories });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error processing Miro notes." });
  }
};

export const commitCuratedStories: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const { miroBoardId, trelloBoardId, targetListId, stories, language } = req.body as {
    miroBoardId: string;
    trelloBoardId: string;
    targetListId: string;
    stories: CuratedStory[];
    language?: Language;
  };
  const userId = req.user?.id;

  if (!userId || !miroBoardId || !trelloBoardId || !targetListId || !Array.isArray(stories)) {
    return res.status(400).json({ error: "Estrutura de dados ou parâmetros incompletos para efetuar a exportação." });
  }

  try {
    const trelloToken = await getOrRefreshToken(userId, "trello");
    if (!trelloToken) return res.status(401).json({ error: "Integração com o Trello ativa não encontrada." });

    const result = await persistCuratedStories(userId, miroBoardId, trelloBoardId, targetListId, stories, trelloToken, language || "pt");
    
    res.status(200).json({ status: "success", ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro interno ao exportar requisitos." });
  }
};

export const checkSyncStatus: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Sessão inválida." });

  try {
    const trelloToken = await getOrRefreshToken(userId, "trello");
    if (!trelloToken) return res.status(401).json({ error: "Conexão com o Trello não encontrada." });

    const syncStatus = await checkOnDemandSync(userId, trelloToken);
    res.status(200).json(syncStatus);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao verificar sincronia." });
  }
};

export const executeSyncPull: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { mappingId } = req.body as { mappingId: string };

  if (!userId || !mappingId) {
    return res.status(400).json({ error: "Parâmetros incompletos." });
  }

  try {
    const miroToken = await getOrRefreshToken(userId, "miro");
    const trelloToken = await getOrRefreshToken(userId, "trello");

    if (!miroToken || !trelloToken) {
      return res.status(401).json({ error: "Conexões com Miro ou Trello ativas não encontradas." });
    }

    const result = await applySyncPull(userId, mappingId, miroToken, trelloToken);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Falha ao aplicar sincronização." });
  }
};