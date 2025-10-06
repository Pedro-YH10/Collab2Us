import { dbQuery, hasDb } from "../db";

//Salvar um Token(Que pode ser do Google, Miro ou Trello):
export async function saveToken(userId: string, provider: "google" | "miro" | "trello", accessToken: string, refreshToken?: string, expiresAt?: Date, scope?: string) {
  const oneDay = 24 * 60 * 60 * 1000;
  const maxExpiry = new Date(Date.now() + oneDay);
  const finalExpiry = expiresAt ? new Date(Math.min(expiresAt.getTime(), maxExpiry.getTime())) : maxExpiry;
  if (hasDb) {
    await dbQuery(
      `insert into oauth_tokens(user_id, provider, access_token, refresh_token, expires_at, scope)
       values ($1,$2,$3,$4,$5,$6)`,
      [userId, provider, accessToken, refreshToken ?? null, finalExpiry ?? null, scope ?? null],
    );
    return;
  }
}

//Pegar um Token:
export async function getToken(userId: string, provider: "google" | "miro" | "trello") {
  if (hasDb) {
    const r = await dbQuery<{ access_token: string; refresh_token: string | null; expires_at: Date | null; scope: string | null }>(
      `select access_token, refresh_token, expires_at, scope from oauth_tokens where user_id=$1 and provider=$2 order by created_at desc limit 1`,
      [userId, provider],
    );
    return r.rows[0] ?? null;
  }
  return null;
}

//Deletar um Token por ID de usuário:
export async function deleteTokensByUserId(userId: string): Promise<void> {
  if (hasDb) {
    await dbQuery(`delete from oauth_tokens where user_id=$1`, [userId]);
  }
}
