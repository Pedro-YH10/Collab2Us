import { Response, RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getOrRefreshToken } from "../models/tokens";

const VALID_PROVIDERS = ["google", "miro", "trello"] as const;
type ProviderType = typeof VALID_PROVIDERS[number];

async function verifyProviderToken(provider: ProviderType, token: string): Promise<boolean> {
  try {
    if (provider === "miro") {
      const res = await fetch("https://api.miro.com/v2/boards?limit=1", {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(4000)
      });
      return res.ok;
    }

    if (provider === "trello") {
      const key = process.env.TRELLO_KEY;
      if (!key) return false;

      const url = `https://api.trello.com/1/members/me?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}&fields=id`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(4000)
      });
      return res.ok;
    }

    return true;
  } catch {
    return false;
  }
}

export const getTokenInfo: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const rawProvider = req.query.provider as string;

  if (!userId) {
    return res.status(401).json({ error: "Sessão inválida ou não autenticada." });
  }

  if (!rawProvider || !VALID_PROVIDERS.includes(rawProvider as ProviderType)) {
    return res.status(400).json({ error: "Provedor inválido. Escolha entre: google, miro ou trello." });
  }

  const provider = rawProvider as ProviderType;

  try {
    const activeToken = await getOrRefreshToken(userId, provider);
    if (!activeToken) {
      return res.status(200).json({ provider, hasToken: false, isValid: false });
    }

    const isValid = await verifyProviderToken(provider, activeToken);

    return res.status(200).json({ 
      provider, 
      hasToken: true, 
      isValid, 
      token: activeToken 
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Erro ao consultar credenciais." });
  }
};