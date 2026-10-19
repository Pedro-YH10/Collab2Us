import { dbQuery, hasDb } from "../db";

export interface OAuthTokenData {
  access_token: string;
  refresh_token: string | null;
  expires_at: Date | null;
  scope: string | null;
}

const refreshPromises = new Map<string, Promise<string | null>>();

export async function getToken(userId: string, provider: "google" | "miro" | "trello"): Promise<OAuthTokenData | null> {
  if (hasDb) {
    const r = await dbQuery<OAuthTokenData>(
      `select access_token, refresh_token, expires_at, scope 
       from oauth_tokens where user_id=$1 and provider=$2 
       order by created_at desc limit 1`,
      [userId, provider]
    );
    return r.rows[0] ?? null;
  }
  return null;
}

// Salva ou atualiza os tokens OAuth (Google, Miro ou Trello) por usuário
export async function saveToken(
  userId: string, 
  provider: "google" | "miro" | "trello", 
  accessToken: string, 
  refreshToken?: string, 
  expiresAt?: Date, 
  scope?: string
): Promise<void> {
  if (!hasDb) return;

  const maxExpiry = expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

  await dbQuery(
    `insert into oauth_tokens(user_id, provider, access_token, refresh_token, expires_at, scope)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (user_id, provider) do update set 
       access_token = excluded.access_token,
       refresh_token = coalesce(excluded.refresh_token, oauth_tokens.refresh_token),
       expires_at = excluded.expires_at,
       scope = excluded.scope,
       created_at = now()`,
    [userId, provider, accessToken, refreshToken ?? null, maxExpiry, scope ?? null]
  );
}

// Retorna o token ativo do Miro ou executa o refresh se faltar menos de 5 minutos para expirar.
// Usa lock em memória para evitar requisições concorrentes de refresh com o mesmo token.
export async function getOrRefreshToken(userId: string, provider: "google" | "miro" | "trello"): Promise<string | null> {
  if (!hasDb) return null;

  const tokenInfo = await getToken(userId, provider);
  if (!tokenInfo) return null;

  const expiresAt = tokenInfo.expires_at ? new Date(tokenInfo.expires_at) : null;
  const isNearExpiry = expiresAt && (expiresAt.getTime() - Date.now() < 5 * 60 * 1000); // 5 minutos de margem

  if (isNearExpiry && tokenInfo.refresh_token && provider === "miro") {
    const lockKey = `${userId}:${provider}`;

    if (refreshPromises.has(lockKey)) {
      return refreshPromises.get(lockKey)!;
    }

    const refreshJob = (async () => {
      try {
        const refreshed = await refreshMiroToken(tokenInfo.refresh_token!);
        if (refreshed) {
          const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
          await saveToken(userId, "miro", refreshed.access_token, refreshed.refresh_token, newExpiry, refreshed.scope);
          return refreshed.access_token;
        }
      } catch (err) {
        console.error(`[OAuth] Erro na renovação automática para user_id ${userId}:`, err);
      } finally {
        refreshPromises.delete(lockKey); // Libera o lock após conclusão ou erro
      }
      return tokenInfo.access_token; // Fallback: retorna o token atual mesmo instável
    })();

    refreshPromises.set(lockKey, refreshJob);
    return refreshJob;
  }

  return tokenInfo.access_token;
}

// Chama a API do Miro para renovar o access_token usando o refresh_token
async function refreshMiroToken(refreshToken: string) {
  const clientId = process.env.MIRO_CLIENT_ID;
  const clientSecret = process.env.MIRO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Chaves de aplicação MIRO_CLIENT_ID ou MIRO_CLIENT_SECRET ausentes no ambiente.");
  }

  const res = await fetch("https://api.miro.com/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const errorDetails = await res.text().catch(() => "");
    throw new Error(`Resposta HTTP ${res.status} ao renovar token Miro: ${errorDetails}`);
  }

  return res.json() as Promise<{ 
    access_token: string; 
    refresh_token: string; 
    expires_in: number; 
    scope: string 
  }>;
}

export async function deleteTokensByUserId(userId: string): Promise<void> {
  if (hasDb) {
    await dbQuery(`delete from oauth_tokens where user_id=$1`, [userId]);
  }
}