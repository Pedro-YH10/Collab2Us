import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_default_secret_key_collab2us";

if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "fallback_default_secret_key_collab2us")) {
  console.error("CRITICAL SECURITY ERROR: JWT_SECRET não configurado no ambiente de produção.");
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Valida o token JWT via cookie HTTPOnly ou header Bearer e injeta o usuário autenticado na requisição
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined = req.cookies?.["c2u_session"];

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Sessão inválida ou não autenticada." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Sessão expirada. Por favor, realize o login novamente." });
  }
}