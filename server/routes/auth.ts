import { RequestHandler } from "express";
import type { AuthCredentials, AuthResponse, User } from "@shared/api";
import { createUser, verifyUser, findUserByEmail } from "../models/users";

//Registrar uma conta:
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
    const response: AuthResponse = { user: { ...user, provider: "local" } };
    res.status(201).json(response);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Erro ao cadastrar" });
  }
};

//Logar em uma conta:
export const login: RequestHandler = async (req, res) => {
  const body = req.body as AuthCredentials;
  const { email, password } = body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }
  try {
    const user = await verifyUser(email, password);
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });
    const response: AuthResponse = { user: { ...user, provider: "local" } };
    res.status(200).json(response);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Erro ao entrar" });
  }
};

//Sair de uma conta:
export const logout: RequestHandler = (_req, res) => {
  res.status(200).json({ message: "ok" });
};

//Logar com a conta do Google:
export const googleOAuthStart: RequestHandler = (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(400).json({
      error: "Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI no ambiente.",
    });
  }
  return res.status(501).json({ error: "Fluxo OAuth ainda não finalizado" });
};
