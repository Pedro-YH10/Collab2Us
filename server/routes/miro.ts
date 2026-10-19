import { Response, RequestHandler } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import * as Miro from "../services/miro";
import { getOrRefreshToken } from "../models/tokens";
import { dbQuery, hasDb } from "../db";

export const getMiroBoards: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Sessão inválida." });

  try {
    const token = await getOrRefreshToken(userId, "miro");
    if (!token) return res.status(200).json({ boards: [] });

    const boards = await Miro.listBoards(token);
    res.status(200).json({ boards: boards.map((b) => ({ ...b, source: "miro" })) });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Erro ao consultar quadros no Miro." });
  }
};

export const searchMiroBoards: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const q = (req.query.q as string) || "";
  if (!userId) return res.status(401).json({ error: "Sessão inválida." });

  try {
    const token = await getOrRefreshToken(userId, "miro");
    if (!token) return res.status(200).json({ boards: [] });

    const boards = await Miro.searchBoards(q, token);
    res.status(200).json({ boards: boards.map((b) => ({ ...b, source: "miro" })) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const updateMiroBoard: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const id = req.params.id;
  const { name } = req.body as { name?: string };

  if (!userId) return res.status(401).json({ error: "Sessão inválida." });
  if (!id || !name) return res.status(400).json({ error: "Informe id e name" });

  try {
    const token = await getOrRefreshToken(userId, "miro");
    if (!token) return res.status(401).json({ error: "Conexão com o Miro não configurada." });

    await Miro.updateBoardName(id, name, token);
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const deleteMiroBoard: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const id = req.params.id;

  if (!userId) return res.status(401).json({ error: "Sessão inválida." });
  if (!id) return res.status(400).json({ error: "Informe id" });

  try {
    const token = await getOrRefreshToken(userId, "miro");
    if (!token) return res.status(401).json({ error: "Conexão com o Miro não configurada." });

    await Miro.deleteBoard(id, token);
    res.status(200).json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const debugMiroItems: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const boardId = req.query.boardId as string;
    
    if (!userId) return res.status(401).json({ error: "Sessão inválida." });
    if (!boardId) return res.status(400).json({ error: "boardId é obrigatório na query string" });

    const token = await getOrRefreshToken(userId, "miro");
    if (!token) return res.status(401).json({ error: "Conexão com o Miro não configurada." });

    const items = await Miro.getAllConnectors(boardId, token);
    res.status(200).json({ items });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const instantiateTemplate: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const boardId = req.params.id;
  const { templateType, language } = (req.body || {}) as { templateType?: "canvas" | "usm" | "discovery"; language?: "pt" | "en" | "es" };

  if (!userId) return res.status(401).json({ error: "Unauthorized session." });
  if (!boardId) return res.status(400).json({ error: "Missing boardId." });

  try {
    const token = await getOrRefreshToken(userId, "miro");
    if (!token) return res.status(401).json({ error: "Miro connection not configured." });

    let roleColor = "yellow";
    let criteriaColor = "green";

    if (hasDb) {
      const settings = await dbQuery<{ yellow_role_color: string; green_criteria_color: string }>(
        `select yellow_role_color, green_criteria_color from workflow_settings where user_id = $1`,
        [userId]
      );
      if (settings.rows[0]) {
        roleColor = settings.rows[0].yellow_role_color;
        criteriaColor = settings.rows[0].green_criteria_color;
      }
    }

    const result = await Miro.instantiateStructuredCanvas(
      boardId, 
      templateType || "canvas", 
      { roleColor, criteriaColor }, 
      token,
      language || "en"
    );

    res.status(200).json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const createMiroBoard: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, templateType, language } = req.body;
  if (!userId || !name) return res.status(400).json({ error: "Nome é obrigatório." });

  try {
    const token = await getOrRefreshToken(userId, "miro");
    if (!token) return res.status(401).json({ error: "Integração do Miro ausente." });

    const board = await Miro.createBoard(name, token);
    // Já instancia o template estruturado no novo quadro
    await Miro.instantiateStructuredCanvas(board.id, templateType || "canvas", {}, token, language || "pt");
    res.status(201).json({ board });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};