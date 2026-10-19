import { Response, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { AuthCredentials, AuthResponse } from "@shared/api";
import { createUser, verifyUser, findUserByEmail } from "../models/users";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_default_secret_key_collab2us";

export function setSessionCookie(res: Response, user: { id: string; email: string }) {
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1d" });
  
  res.cookie("c2u_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", //Lax permite o envio do cookie ao retornar de redirecionamentos externos SSO.
    maxAge: 24 * 60 * 60 * 1000 //Mantém a sessão por 1 dia inteiro.
  });
}

export const register: RequestHandler = async (req, res) => {
  const body = req.body as AuthCredentials;
  const { name, email, password } = body || {};
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
  }
  try {
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email já cadastrado" });
    
    const user = await createUser(name, email, password);
    setSessionCookie(res, { id: user.id, email: user.email });
    
    const response: AuthResponse = { user: { ...user, provider: "local" } };
    res.status(201).json(response);
  } catch (e: any) {
    console.error("[Auth Register System Error]:", e);
    res.status(500).json({ error: "Falha interna ao processar o cadastro do usuário." });
  }
};

export const login: RequestHandler = async (req, res) => {
  const body = req.body as AuthCredentials;
  const { email, password } = body || {};
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }
  try {
    const user = await verifyUser(email, password);
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });
    
    setSessionCookie(res, { id: user.id, email: user.email });
    
    const response: AuthResponse = { user: { ...user, provider: "local" } };
    res.status(200).json(response);
  } catch (e: any) {
    console.error("[Auth Login System Error]:", e);
    res.status(500).json({ error: "Falha interna ao realizar login do usuário." });
  }
};

export const logout: RequestHandler = (_req, res) => {
  res.clearCookie("c2u_session");
  res.status(200).json({ message: "Sessão encerrada com sucesso." });
};