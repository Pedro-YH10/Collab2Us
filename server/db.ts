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
  pool.query("select 1").catch((err) => {
    console.error("Failed to connect to Postgres:", err);
  });

  if (process.env.DB_AUTO_MIGRATE === "true") {
    try {
      const schemaPath = path.join(process.cwd(), "server/sql/schema.sql");
      const sql = fs.readFileSync(schemaPath, "utf8");
      pool.query(sql).catch((e) => console.error("Migration error:", e));
    } catch (e) {
      console.error("Could not run migrations:", e);
    }
  }
}

export async function dbQuery<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  if (!pool) throw new Error("Banco de dados não configurado");
  return pool.query(text, params);
}
