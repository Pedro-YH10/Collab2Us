import { RequestHandler } from "express";
import { findUserById, updateUser, deleteUser } from "../models/users";
import { deleteTokensByUserId } from "../models/tokens";
import { required } from "../services/http"; // Importar required de http.ts

//Rota de pegar um usuário:
export const getUser: RequestHandler = async (req, res) => {
  try {
    const userId = required((req.params.id as string) || (req.header("X-User-Id") as string));
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.status(200).json({ user });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

//Rota de atualizar o nome de um usuário:
export const updateUserName: RequestHandler = async (req, res) => {
  try {
    const userId = required((req.params.id as string) || (req.header("X-User-Id") as string));
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

    const updatedUser = await updateUser(userId, { name });
    if (!updatedUser) return res.status(404).json({ error: "Usuário não encontrado para atualizar" });

    res.status(200).json({ user: updatedUser });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};

//Rota de deletar um usuário:
export const deleteUserAccount: RequestHandler = async (req, res) => {
  try {
    const userId = required((req.params.id as string) || (req.header("X-User-Id") as string));

    await deleteTokensByUserId(userId); // Excluir tokens primeiro
    const deleted = await deleteUser(userId);
    if (!deleted) return res.status(404).json({ error: "Usuário não encontrado para excluir" });

    res.status(200).json({ status: "ok" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
};
