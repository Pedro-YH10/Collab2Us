import { Response, RequestHandler } from "express";
import crypto from "node:crypto";
import { AuthenticatedRequest } from "../middleware/auth";
import { dbQuery, hasDb } from "../db";

const memWorkflow = new Map<string, any>();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "collab2us_default_encryption_key_32bytes!!";

// Criptografa chaves de API com AES-256-CBC antes de persistir no PostgreSQL
export function encryptSecret(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(16);
  const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(32, "!").slice(0, 32));
  const cipher = crypto.createCipheriv("aes-256-cbc", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

// Descriptografa a chave ao consultar o banco. Retorna o texto puro caso seja uma chave legada
export function decryptSecret(text: string): string {
  if (!text || !text.includes(":")) return text;
  try {
    const [ivHex, encryptedText] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(32, "!").slice(0, 32));
    const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuffer, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return text; // Retorna o texto original em caso de chave legada em texto puro
  }
}

// Retorna as preferências de workflow do usuário (score mínimo QUS, template padrão e chaves)
export const getWorkflowSettings: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Sessão inválida" });

  try {
    if (hasDb) {
      const result = await dbQuery<{
        min_qus_score: number;
        default_template: string;
        yellow_role_color: string;
        green_criteria_color: string;
        ai_provider: string;
        ai_model: string;
        ai_api_key: string;
        custom_system_prompt: string;
      }>(
        `select min_qus_score, default_template, yellow_role_color, green_criteria_color, ai_provider, ai_model, ai_api_key, custom_system_prompt 
         from workflow_settings where user_id = $1`,
        [userId]
      );
      if (result.rows[0]) {
        const row = result.rows[0];
        return res.status(200).json({
          ...row,
          ai_api_key: row.ai_api_key ? decryptSecret(row.ai_api_key) : ""
        });
      }
    }

    const fallback = memWorkflow.get(userId) || {
      min_qus_score: 70,
      default_template: "connextra",
      yellow_role_color: "yellow",
      green_criteria_color: "green",
      ai_provider: "openai",
      ai_model: "",
      ai_api_key: "",
      custom_system_prompt: ""
    };
    return res.status(200).json({
      ...fallback,
      ai_api_key: fallback.ai_api_key ? decryptSecret(fallback.ai_api_key) : ""
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Erro ao ler configurações." });
  }
};

export const saveWorkflowSettings: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Sessão inválida" });

  const { 
    min_qus_score, 
    default_template, 
    yellow_role_color, 
    green_criteria_color,
    ai_provider,
    ai_model,
    ai_api_key,
    custom_system_prompt
  } = req.body;

  if (min_qus_score === undefined || !default_template) {
    return res.status(400).json({ error: "Parâmetros min_qus_score e default_template são obrigatórios." });
  }

  try {
    const protectedApiKey = ai_api_key ? encryptSecret(ai_api_key.trim()) : null;

    if (hasDb) {
      await dbQuery(`alter table workflow_settings add column if not exists ai_provider text not null default 'openai';`).catch(() => {});
      await dbQuery(`alter table workflow_settings add column if not exists ai_model text;`).catch(() => {});
      await dbQuery(`alter table workflow_settings add column if not exists ai_api_key text;`).catch(() => {});
      await dbQuery(`alter table workflow_settings add column if not exists custom_system_prompt text;`).catch(() => {});

      await dbQuery(
        `insert into workflow_settings (
           user_id, min_qus_score, default_template, yellow_role_color, green_criteria_color, ai_provider, ai_model, ai_api_key, custom_system_prompt
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (user_id) do update set
           min_qus_score = excluded.min_qus_score,
           default_template = excluded.default_template,
           yellow_role_color = excluded.yellow_role_color,
           green_criteria_color = excluded.green_criteria_color,
           ai_provider = excluded.ai_provider,
           ai_model = excluded.ai_model,
           ai_api_key = excluded.ai_api_key,
           custom_system_prompt = excluded.custom_system_prompt`,
        [
          userId, 
          min_qus_score, 
          default_template, 
          yellow_role_color || "yellow", 
          green_criteria_color || "green",
          ai_provider || "openai",
          ai_model || null,
          protectedApiKey,
          custom_system_prompt || null
        ]
      );
    }

    memWorkflow.set(userId, {
      min_qus_score,
      default_template,
      yellow_role_color,
      green_criteria_color,
      ai_provider,
      ai_model,
      ai_api_key: protectedApiKey,
      custom_system_prompt
    });

    return res.status(200).json({ status: "success" });
  } catch (e: any) {
    console.error("[Workflow Save Error]:", e);
    return res.status(500).json({ error: e.message || "Erro ao gravar preferências de workflow." });
  }
};