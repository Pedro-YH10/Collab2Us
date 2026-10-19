import { dbQuery, hasDb } from "../db";
import bcrypt from "bcryptjs";
import type { User } from "@shared/api";
import crypto from "node:crypto";

const mem = {
  users: new Map<string, { user: User; passwordHash: string }>(),
};

export async function createUser(name: string, email: string, password: string): Promise<User> {
  const normalized = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);
  if (hasDb) {
    const result = await dbQuery<{ id: string }>(
      `insert into users(name,email,password_hash) values ($1,$2,$3) returning id`,
      [name, normalized, passwordHash],
    );
    return { id: result.rows[0].id, name, email: normalized };
  }
  if (mem.users.has(normalized)) throw new Error("Email já cadastrado");
  const user: User = { id: crypto.randomUUID(), name, email: normalized };
  mem.users.set(normalized, { user, passwordHash });
  return user;
}

export async function findUserByEmail(email: string): Promise<{ user: User; passwordHash: string } | null> {
  const normalized = email.toLowerCase();
  if (hasDb) {
    const result = await dbQuery<{ id: string; name: string; email: string; password_hash: string }>(
      `select id, name, email, password_hash from users where email=$1`,
      [normalized],
    );
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return { user: { id: r.id, name: r.name, email: r.email }, passwordHash: r.password_hash };
  }
  return mem.users.get(normalized) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (hasDb) {
    const result = await dbQuery<{ id: string; name: string; email: string }>(
      `select id, name, email from users where id=$1`,
      [id],
    );
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return { id: r.id, name: r.name, email: r.email };
  }
  for (const record of mem.users.values()) {
    if (record.user.id === id) return record.user;
  }
  return null;
}

export async function updateUser(userId: string, data: { name?: string; email?: string; password?: string }): Promise<User | null> {
  if (hasDb) {
    const updates: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name=$${paramIndex++}`);
      params.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push(`email=$${paramIndex++}`);
      params.push(data.email.toLowerCase());
    }
    if (data.password !== undefined) {
      const passwordHash = await bcrypt.hash(data.password, 10);
      updates.push(`password_hash=$${paramIndex++}`);
      params.push(passwordHash);
    }

    if (updates.length === 0) return findUserById(userId);

    params.push(userId);
    const result = await dbQuery<{ id: string; name: string; email: string }>(
      `update users set ${updates.join(', ')} where id=$${paramIndex} returning id, name, email`,
      params,
    );
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return { id: r.id, name: r.name, email: r.email };
  }
  
  for (const record of mem.users.values()) {
    if (record.user.id === userId) {
      if (data.name !== undefined) record.user.name = data.name;
      if (data.email !== undefined) {
        const oldEmail = record.user.email;
        const newEmail = data.email.toLowerCase();
        
        if (oldEmail !== newEmail) {
          record.user.email = newEmail;
          mem.users.delete(oldEmail);
          mem.users.set(newEmail, record);
        }
      }
      if (data.password !== undefined) {
        record.passwordHash = await bcrypt.hash(data.password, 10);
      }
      return record.user;
    }
  }
  return null;
}

export async function deleteUser(userId: string): Promise<boolean> {
  if (hasDb) {
    const result = await dbQuery<any>(`delete from users where id=$1`, [userId]);
    return result.rowCount > 0;
  }
  let deleted = false;
  for (const [key, record] of mem.users.entries()) {
    if (record.user.id === userId) {
      mem.users.delete(key);
      deleted = true;
      break;
    }
  }
  return deleted;
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
  const record = await findUserByEmail(email);
  if (!record) return null;
  const ok = await bcrypt.compare(password, record.passwordHash);
  return ok ? record.user : null;
}