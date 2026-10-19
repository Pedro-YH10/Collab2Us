import { Response, RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { refineUserStoryWithAI, generateIdeationStickiesWithAI, splitMonolithicStoryWithAI, fetchAvailableModels, AIProvider, Language } from "../services/ai";
import * as Miro from "../services/miro";
import { getOrRefreshToken } from "../models/tokens";
import { dbQuery, hasDb } from "../db";
import { decryptSecret } from "./workflow";

async function getUserAISettings(userId: string): Promise<{ provider: AIProvider; model?: string; apiKey?: string; systemPrompt?: string }> {
  if (hasDb) {
    const res = await dbQuery<{ ai_provider: AIProvider; ai_model: string; ai_api_key: string; custom_system_prompt: string }>(
      `select ai_provider, ai_model, ai_api_key, custom_system_prompt from workflow_settings where user_id = $1`,
      [userId]
    );
    if (res.rows[0]) {
      return {
        provider: res.rows[0].ai_provider || "openai",
        model: res.rows[0].ai_model || undefined,
        apiKey: res.rows[0].ai_api_key ? decryptSecret(res.rows[0].ai_api_key) : undefined,
        systemPrompt: res.rows[0].custom_system_prompt || undefined
      };
    }
  }
  return { provider: "openai" };
}

export const handleAIGetModels: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const provider = (req.query.provider as AIProvider) || "openai";
  const apiKeyQuery = req.query.apiKey as string | undefined;

  if (!userId) return res.status(401).json({ error: "Sessão inválida." });

  try {
    const userSettings = await getUserAISettings(userId);
    const apiKeyToUse = apiKeyQuery || userSettings.apiKey;

    const models = await fetchAvailableModels(provider, apiKeyToUse);
    res.status(200).json({ models });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Não foi possível carregar os modelos do provedor." });
  }
};

export const handleAIRefineStory: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { text, language } = req.body as { text: string; language?: Language };

  if (!userId || !text) return res.status(400).json({ error: "Sessão inválida ou texto não informado." });

  try {
    const settings = await getUserAISettings(userId);
    const refinement = await refineUserStoryWithAI(text, {
      provider: settings.provider,
      model: settings.model,
      apiKey: settings.apiKey,
      customSystemPrompt: settings.systemPrompt,
    });

    res.status(200).json(refinement);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro no processamento da IA." });
  }
};

export const handleAIGenerateIdeas: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { concept, miroBoardId, language } = req.body as { concept: string; miroBoardId?: string; language?: Language };

  if (!userId || !concept) return res.status(400).json({ error: "Sessão inválida ou conceito não informado." });

  try {
    const settings = await getUserAISettings(userId);
    const ideation = await generateIdeationStickiesWithAI(concept, {
      provider: settings.provider,
      model: settings.model,
      apiKey: settings.apiKey,
      customSystemPrompt: settings.systemPrompt,
      language: language || "pt"
    });

    if (miroBoardId) {
      const miroToken = await getOrRefreshToken(userId, "miro");
      if (miroToken) {
        let xOffset = -200;
        for (const item of ideation.stickies) {
          const color = item.role === "actor" ? "yellow" : item.role === "action" ? "cyan" : item.role === "criteria" ? "green" : "orange";
          await Miro.createStickyAt(miroBoardId, item.text, xOffset, 0, color, miroToken);
          xOffset += 220;
        }
      }
    }

    res.status(200).json(ideation);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro na geração de ideias por IA." });
  }
};

export const handleAISplitStory: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { text, language } = req.body as { text: string; language?: Language };

  if (!userId || !text) return res.status(400).json({ error: "Sessão inválida ou texto não informado." });

  try {
    const settings = await getUserAISettings(userId);
    const splitResult = await splitMonolithicStoryWithAI(text, {
      provider: settings.provider,
      model: settings.model,
      apiKey: settings.apiKey,
      customSystemPrompt: settings.systemPrompt,
      language: language || "pt"
    });

    res.status(200).json(splitResult);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro na divisão de requisitos por IA." });
  }
};