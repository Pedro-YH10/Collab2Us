import { RequestHandler, Response } from "express";
import { saveToken } from "../models/tokens";
import { createUser, findUserByEmail } from "../models/users";
import { setSessionCookie } from "./auth";
import jwt from "jsonwebtoken";
import { required } from "../services/http";
import crypto from "node:crypto";
import { AuthenticatedRequest } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_default_secret_key_collab2us";

function baseUrlEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Env ${name} não configurada`);
  return v;
}

export const googleStart: RequestHandler = (req, res) => {
  try {
    const clientId = baseUrlEnv("GOOGLE_CLIENT_ID");
    const redirectUri = baseUrlEnv("GOOGLE_REDIRECT_URI");
    
    const stateToken = jwt.sign(
      { chain: String(req.query.chain || "") }, 
      JWT_SECRET, 
      { expiresIn: "15m" }
    );
    
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", stateToken);
    res.redirect(url.toString());
  } catch (e: any) {
    console.error("[OAuth Google Start Error]:", e);
    res.status(500).send("Erro interno ao iniciar autenticação com o Google.");
  }
};

export const googleCallback: RequestHandler = async (req, res) => {
  try {
    const code = required(req.query.code as string);
    const stateToken = required(req.query.state as string);

    let decodedState: { chain?: string };
    try {
      decodedState = jwt.verify(stateToken, JWT_SECRET) as { chain?: string };
    } catch {
      return res.status(403).send("Falha na validação de segurança (State inválido ou expirado).");
    }

    const clientId = baseUrlEnv("GOOGLE_CLIENT_ID");
    const clientSecret = baseUrlEnv("GOOGLE_CLIENT_SECRET");
    const redirectUri = baseUrlEnv("GOOGLE_REDIRECT_URI");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code,
      }),
    });
    
    const tokenJson: any = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenJson.error_description || "Falha na validação com o Google");

    const idToken = tokenJson.id_token as string | undefined;
    if (!idToken) throw new Error("ID Token ausente.");

    const decoded: any = jwt.decode(idToken) || {};
    const email: string = decoded?.email;
    const name: string = decoded?.name || "Usuário SSO";

    if (!email) throw new Error("Email não retornado pelo provedor Google.");

    let user = await findUserByEmail(email);
    let userId = user?.user.id;
    if (!user) {
      const u = await createUser(name, email, crypto.randomBytes(16).toString("hex"));
      userId = u.id;
      user = { user: u, passwordHash: "" };
    }

    await saveToken(userId!, "google", tokenJson.access_token, tokenJson.refresh_token, tokenJson.expires_in ? new Date(Date.now() + tokenJson.expires_in * 1000) : undefined, tokenJson.scope);
    setSessionCookie(res, { id: userId!, email: user.user.email });

    const chain = decodedState.chain || "";
    if (chain === "all") {
      return res.redirect(`/api/auth/miro/start?chain=trello`);
    }

    return res.redirect("/settings?connected=google");
  } catch (e: any) {
    console.error("[OAuth Google Callback Error]:", e);
    res.status(500).send("Falha interna durante a validação da conta Google.");
  }
};

export const miroStart: RequestHandler = (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientId = baseUrlEnv("MIRO_CLIENT_ID");
    const redirectUri = baseUrlEnv("MIRO_REDIRECT_URI");
    const userId = req.user?.id || (req.query.userId as string) || "";
    
    if (!userId) {
      return res.status(400).send("<h3>Usuário não identificado para conexão com o Miro.</h3>");
    }

    const stateToken = jwt.sign(
      { userId, chain: String(req.query.chain || "") }, 
      JWT_SECRET, 
      { expiresIn: "15m" }
    );

    const url = new URL("https://miro.com/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", stateToken);
    url.searchParams.set("scope", "boards:read boards:write");
    res.redirect(url.toString());
  } catch (e: any) {
    console.error("[OAuth Miro Start Error]:", e);
    res.status(500).send("Erro interno ao iniciar autenticação com o Miro.");
  }
};

export const miroCallback: RequestHandler = async (req, res) => {
  try {
    const code = required(req.query.code as string);
    const stateToken = required(req.query.state as string);

    let decodedState: { userId: string; chain?: string };
    try {
      decodedState = jwt.verify(stateToken, JWT_SECRET) as { userId: string; chain?: string };
    } catch {
      return res.status(403).send("Falha na validação de segurança do Miro (State inválido ou expirado).");
    }

    const userId = decodedState.userId;
    const clientId = baseUrlEnv("MIRO_CLIENT_ID");
    const clientSecret = baseUrlEnv("MIRO_CLIENT_SECRET");
    const redirectUri = baseUrlEnv("MIRO_REDIRECT_URI");

    const tokenRes = await fetch("https://api.miro.com/v1/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenJson: any = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenJson?.message || "Falha ao autenticar no Miro");

    await saveToken(userId, "miro", tokenJson.access_token, tokenJson.refresh_token, tokenJson.expires_in ? new Date(Date.now() + tokenJson.expires_in * 1000) : undefined, tokenJson.scope);

    const chain = decodedState.chain || "";
    if (chain === "trello") {
      return res.redirect(`/api/auth/trello/start?userId=${userId}`);
    }

    return res.redirect("/settings?connected=miro");
  } catch (e: any) {
    console.error("[OAuth Miro Callback Error]:", e);
    res.status(500).send("Falha interna durante a validação da conta Miro.");
  }
};

export const trelloStart: RequestHandler = (req: AuthenticatedRequest, res: Response) => {
  try {
    const key = baseUrlEnv("TRELLO_KEY");
    const returnUrl = baseUrlEnv("TRELLO_REDIRECT_URI");
    const userId = req.user?.id || (req.query.userId as string) || "";

    if (!userId) {
      return res.status(400).send("<h3>Usuário não identificado para conexão com o Trello.</h3>");
    }

    const url = new URL("https://trello.com/1/authorize");
    url.searchParams.set("expiration", "never");
    url.searchParams.set("name", "Collab2Us");
    url.searchParams.set("scope", "read,write");
    url.searchParams.set("response_type", "token");
    url.searchParams.set("key", key);
    url.searchParams.set("return_url", `${returnUrl}?userId=${encodeURIComponent(userId)}`);
    res.redirect(url.toString());
  } catch (e: any) {
    console.error("[OAuth Trello Start Error]:", e);
    res.status(500).send("Erro interno ao iniciar autenticação com o Trello.");
  }
};

export const trelloCallbackPage: RequestHandler = (req, res) => {
  const userId = String(req.query.userId || "");
  res.type("html").send(`<!doctype html><html><body><script>
    (function(){
      var h = window.location.hash || '';
      var params = new URLSearchParams(h.replace(/^#/, ''));
      var token = params.get('token');
      if(!token){ document.body.innerText='Token não encontrado'; return; }
      fetch('/api/auth/trello/save-token?userId=${encodeURIComponent(userId)}', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})})
        .then(function(){ window.location.href='/settings?connected=trello'; })
        .catch(function(){ document.body.innerText='Falha ao salvar token'; });
    })();
  </script></body></html>`);
};

export const trelloSaveToken: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const token = (req.body as any)?.token;

    if (!userId) {
      return res.status(401).json({ error: "Sessão inválida ou expirada." });
    }
    if (!token) {
      return res.status(400).json({ error: "Token do Trello é obrigatório." });
    }

    await saveToken(userId, "trello", token);
    res.status(200).json({ status: "ok" });
  } catch (e: any) {
    console.error("[OAuth Trello Save Error]:", e);
    res.status(500).json({ error: "Falha ao gravar credenciais de integração do Trello." });
  }
};

export const saveManualToken: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { provider, access_token, refresh_token, expires_at, scope } = (req.body || {}) as any;
    
    if (!userId) {
      return res.status(401).json({ error: "Sessão inválida ou expirada." });
    }
    if (!provider || !access_token) {
      return res.status(400).json({ error: "Provedor e access_token são obrigatórios." });
    }

    await saveToken(userId, provider, access_token, refresh_token, expires_at ? new Date(expires_at) : undefined, scope);
    res.status(200).json({ status: "ok" });
  } catch (e: any) {
    console.error("[Manual Token Save Error]:", e);
    res.status(500).json({ error: "Falha interna ao gravar credenciais de acesso." });
  }
};