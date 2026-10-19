import { Response, RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { findUserById, updateUser, deleteUser, findUserByEmail } from "../models/users";
import { deleteTokensByUserId } from "../models/tokens";

export const getUser: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sessão não autenticada." });

    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    
    res.status(200).json({ user });
  } catch (e: any) {
    console.error("[User Query Error]:", e);
    res.status(500).json({ error: "Erro interno ao consultar perfil de usuário." });
  }
};

export const getCurrentUser: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sessão não autenticada ou expirada." });

    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "Perfil de usuário não encontrado." });

    res.status(200).json({ user });
  } catch (e: any) {
    console.error("[Session Recovery Error]:", e);
    res.status(500).json({ error: "Erro interno ao restaurar sessão de login." });
  }
};

export const updateUserName: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, email, password } = req.body;
    if (!userId) return res.status(401).json({ error: "Sessão não autenticada." });

    if (name === undefined && email === undefined && password === undefined) {
      return res.status(400).json({ error: "Nenhum dado informado para alteração do perfil." });
    }

    if (email) {
      const existing = await findUserByEmail(email);
      if (existing && existing.user.id !== userId) {
        return res.status(409).json({ error: "O e-mail informado já está em uso por outro usuário." });
      }
    }

    const updatedUser = await updateUser(userId, { name, email, password });
    res.status(200).json({ user: updatedUser });
  } catch (e: any) {
    console.error("[User Update Error]:", e);
    res.status(500).json({ error: "Erro interno ao processar atualização cadastral." });
  }
};

export const deleteUserAccount: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Sessão não autenticada." });

    await deleteTokensByUserId(userId); 
    const deleted = await deleteUser(userId);
    
    if (!deleted) return res.status(404).json({ error: "Usuário não encontrado para exclusão." });

    res.clearCookie("c2u_session");
    res.status(200).json({ status: "ok" });
  } catch (e: any) {
    console.error("[User Account Delete Error]:", e);
    res.status(500).json({ error: "Erro interno ao processar a exclusão da conta." });
  }
};