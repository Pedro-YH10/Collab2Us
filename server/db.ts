import { Pool, PoolConfig, QueryResult } from "pg";
import fs from "node:fs";
import path from "node:path";

let pool: Pool | null = null;

const hasUrl = Boolean(process.env.DATABASE_URL);
const hasParts = Boolean(process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE);
export const hasDb = hasUrl || hasParts;

function sslConfig() {
  return process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined;
}

if (hasDb) {
  const config: PoolConfig = hasUrl
    ? { connectionString: process.env.DATABASE_URL, ssl: sslConfig() }
    : {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: sslConfig(),
      };
  pool = new Pool(config);
  pool.query("select 1")
    .then(() => runMigrations())
    .catch((err) => {
      console.error("Erro de conexão ao banco PostgreSQL:", err);
    });
}

export async function dbQuery<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  if (!pool) throw new Error("Banco de dados não configurado");
  return pool.query(text, params);
}

export async function runMigrations() {
  if (pool) {
    try {
      const schemaPath = path.join(process.cwd(), "server/sql/schema.sql");
      const sql = fs.readFileSync(schemaPath, "utf8");
      await pool.query(sql);

      await pool.query(`
        alter table story_mappings add column if not exists miro_item_url text;
        alter table story_mappings add column if not exists trello_card_url text;
        alter table story_mappings add column if not exists miro_item_ids jsonb default '[]'::jsonb;
        alter table story_mappings add column if not exists content_hash text;
        alter table story_mappings add column if not exists last_synced_at timestamptz default now();
        alter table story_mappings add column if not exists updated_at timestamptz default now();
        
        alter table workflow_settings add column if not exists ai_provider text not null default 'openai';
        alter table workflow_settings add column if not exists ai_model text;
        alter table workflow_settings add column if not exists ai_api_key text;
        alter table workflow_settings add column if not exists custom_system_prompt text;
      `);
    } catch (e) {
      console.error("Falha ao aplicar migrações no banco de dados:", e);
    }
  }
}