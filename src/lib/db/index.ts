import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let sqlite: Database.Database | undefined;

function dbFilePath(): string {
  const raw = process.env.DATABASE_URL ?? "file:./data/cshelper.db";
  return raw.startsWith("file:") ? raw.slice("file:".length) : raw;
}

export function getSqlite(): Database.Database {
  if (!sqlite) {
    const fp = path.resolve(process.cwd(), dbFilePath());
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    sqlite = new Database(fp);
    sqlite.pragma("journal_mode = WAL");
  }
  return sqlite;
}

export function getDb() {
  return drizzle(getSqlite(), { schema });
}

export function getDatabaseFilePath(): string {
  return path.resolve(process.cwd(), dbFilePath());
}
