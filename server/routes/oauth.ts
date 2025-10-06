import { RequestHandler } from "express";
import { saveToken } from "../models/tokens";
import { createUser, findUserByEmail, findUserById } from "../models/users";
import jwt from "jsonwebtoken";
import { required } from "../services/http";

//Pegar as variáveis de ambiente do ".env":
function baseUrlEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Env ${name} não configurada`);
  return v;
}

//Rota de login com o Google:
export const googleStart: RequestHandler = (req, res) => {
  try {
    const clientId = baseUrlEnv("GOOGLE_CLIENT_ID");
    const redirectUri = baseUrlEnv("GOOGLE_REDIRECT_URI");
    const userIdFromQuery = String(req.query.userId || ""); //userId
    //console.log("googleStart - userIdFromQuery:", userIdFromQuery); //Debug
    //console.log("googleStart - GOOGLE_REDIRECT_URI:", redirectUri); //Debug da URI de redirecionamento
    const state = new URLSearchParams({ userId: userIdFromQuery, chain: String(req.query.chain || "") }).toString();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

//Rota de redirecionamento de login com o Google:
export const googleCallback: RequestHandler = async (req, res) => {
  try {
    const code = required(req.query.code as string);
    const stateStr = (req.query.state as string) || "";
    const state = Object.fromEntries(new URLSearchParams(stateStr));
    const userIdFromState = state.userId || "";
    //console.log("googleCallback - userIdFromState:", userIdFromState); //Debug

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
    if (!tokenRes.ok) throw new Error(tokenJson.error_description || "Falha ao trocar o código por token (Google)");

    const idToken = tokenJson.id_token as string | undefined;
    let userId = userIdFromState; //userId do state
    let userName: string = "Usuário";
    let userEmail: string = "";

    if (idToken) {
      const decoded: any = jwt.decode(idToken) || {};
      //console.log("Decoded Google ID Token:", decoded); //Debug
      const email: string | undefined = decoded?.email;
      const name: string = decoded?.name || decoded?.given_name || "Usuário";
      userName = name; //Atualizar userName
      userEmail = email || ""; //Atualizar userEmail

      if (email) {
        const existing = await findUserByEmail(email);
        if (existing) userId = existing.user.id;
        else {
          const u = await createUser(name, email, cryptoRandom());
          userId = u.id;
        }
      }
    }

    await saveToken(userId, "google", tokenJson.access_token, tokenJson.refresh_token, tokenJson.expires_in ? new Date(Date.now() + tokenJson.expires_in * 1000) : undefined, tokenJson.scope);

    const chain = state.chain || "";
    if (chain === "all") {
      const next = new URL(`/api/auth/miro/start?${new URLSearchParams({ userId, chain: "trello" }).toString()}`, req.headers.origin || "");
      return res.redirect(next.toString());
    }

    const finalUser = await findUserById(userId);
    return res.send(htmlAutoLogin(finalUser?.id || userId, finalUser?.name || userName, finalUser?.email || userEmail, "/settings?connected=google"));
  } catch (e: any) {
    res.status(400).send(`<pre>${e.message}</pre>`);
  }
};

//Rota de conectar com o Miro:
export const miroStart: RequestHandler = (req, res) => {
  try {
    const clientId = baseUrlEnv("MIRO_CLIENT_ID");
    const redirectUri = baseUrlEnv("MIRO_REDIRECT_URI");
    const state = new URLSearchParams({ userId: String(req.query.userId || ""), chain: String(req.query.chain || "") }).toString();
    const url = new URL("https://miro.com/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "boards:read"); // Adicionado o scope boards:read
    res.redirect(url.toString());
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

//Rota de redirecionamento ao conectar com o Miro:
export const miroCallback: RequestHandler = async (req, res) => {
  try {
    const code = required(req.query.code as string);
    const stateStr = (req.query.state as string) || "";
    const state = Object.fromEntries(new URLSearchParams(stateStr));
    const userId = required(state.userId);

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

    const chain = state.chain || "";
    if (chain === "trello") {
      const next = new URL(`/api/auth/trello/start?${new URLSearchParams({ userId }).toString()}`, req.headers.origin || "");
      return res.redirect(next.toString());
    }

    return res.redirect("/settings?connected=miro");
  } catch (e: any) {
    res.status(400).send(`<pre>${e.message}</pre>`);
  }
};

//Rota de conectar com o Trello:
export const trelloStart: RequestHandler = (req, res) => {
  try {
    const key = baseUrlEnv("TRELLO_KEY");
    const returnUrl = baseUrlEnv("TRELLO_REDIRECT_URI");
    const userId = String(req.query.userId || "");
    const url = new URL("https://trello.com/1/authorize");
    url.searchParams.set("expiration", "never");
    url.searchParams.set("name", "Collab2Us");
    url.searchParams.set("scope", "read,write");
    url.searchParams.set("response_type", "token");
    url.searchParams.set("key", key);
    url.searchParams.set("return_url", `${returnUrl}?userId=${encodeURIComponent(userId)}`);
    console.log("TRELLO_KEY:", key);
    console.log("TRELLO Redirect URL gerada:", url.toString());
    res.redirect(url.toString());
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

//Rota de redirecionamento ao conectar com o Trello:
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

//Rota de salvar o Token do Trello:
export const trelloSaveToken: RequestHandler = async (req, res) => {
  try {
    const userId = required((req.query.userId as string) || (req.header("X-User-Id") as string));
    const token = required((req.body as any)?.token);
    await saveToken(userId, "trello", token);
    res.status(200).json({ status: "ok" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

//Rota de salvar o Token do Trello de forma manual:
export const saveManualToken: RequestHandler = async (req, res) => {
  try {
    const userId = required((req.header("X-User-Id") as string) || (req.query.userId as string));
    const { provider, access_token, refresh_token, expires_at, scope } = (req.body || {}) as any;
    if (!provider || !access_token) return res.status(400).json({ error: "provider e access_token obrigatórios" });
    await saveToken(userId, provider, access_token, refresh_token, expires_at ? new Date(expires_at) : undefined, scope);
    res.status(200).json({ status: "ok" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

//Criptografar:
function cryptoRandom() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

//Auto login com a sessão salva nos Cookies do Navegador:
function htmlAutoLogin(userId: string, userName: string, userEmail: string, redirect: string) {
  const esc = (s: string) => s.replace(/"/g, '\\"');
  const user = `{\"id\":\"${esc(userId)}\",\"name\":\"${esc(userName)}\",\"email\":\"${esc(userEmail)}\"}`;
  return `<!doctype html><html><body><script>
    try { localStorage.setItem('c2u:user', JSON.stringify(${user})); } catch(e){}
    location.href='${redirect}';
  </script></body></html>`;
}
