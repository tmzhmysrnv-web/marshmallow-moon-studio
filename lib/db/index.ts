import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || "data/marshmallow-moon.db";

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;

export function getDb() {
  if (!db) {
    const dbPath = path.resolve("data", "marshmallow-moon.db");
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    db = drizzle(sqlite, { schema });
  }
  return db;
}

export function getSqlite() {
  if (!sqlite) {
    getDb();
  }
  return sqlite;
}

export { schema };
