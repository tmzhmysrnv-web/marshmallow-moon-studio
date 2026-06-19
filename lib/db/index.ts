import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || path.join("data", "marshmallow-moon.db");

let sqlite: Database.Database;
let db: ReturnType<typeof drizzle>;
let initialized = false;

function getDbPath(): string {
  // On Vercel, use /tmp which is writable
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return path.join("/tmp", "marshmallow-moon.db");
  }
  return path.resolve(DB_PATH);
}

export function getDb() {
  if (!db) {
    const dbPath = getDbPath();
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    db = drizzle(sqlite, { schema });

    // Run migrations on first init
    if (!initialized) {
      initialized = true;
      try {
        migrate(db);
      } catch (e) {
        console.warn("Migration warning (may already exist):", (e as Error).message);
      }
    }
  }
  return db;
}

export function getSqlite() {
  if (!sqlite) getDb();
  return sqlite;
}

// Auto-create tables
function migrate(d: ReturnType<typeof drizzle>) {
  const createStatements = [
    `CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      species TEXT NOT NULL, personality_bio TEXT NOT NULL,
      appearance_prompt TEXT NOT NULL, voice_id TEXT,
      traits TEXT DEFAULT '[]', catchphrases TEXT DEFAULT '[]',
      relationships TEXT DEFAULT '[]', reference_images TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS worlds (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL, style_prompt TEXT NOT NULL,
      color_palette TEXT DEFAULT '[]', reference_images TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL, age_range TEXT NOT NULL DEFAULT '4-8',
      theme TEXT DEFAULT '', character_ids TEXT DEFAULT '[]',
      world_id TEXT REFERENCES worlds(id),
      status TEXT NOT NULL DEFAULT 'draft', page_count INTEGER DEFAULT 6,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS illustrations (
      id TEXT PRIMARY KEY, story_id TEXT NOT NULL REFERENCES stories(id),
      character_ids TEXT DEFAULT '[]', world_id TEXT REFERENCES worlds(id),
      page_number INTEGER NOT NULL, prompt TEXT NOT NULL,
      image_path TEXT NOT NULL, thumbnail_path TEXT,
      "order" INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'generated',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY, story_id TEXT NOT NULL REFERENCES stories(id),
      video_path TEXT NOT NULL, thumbnail_path TEXT, duration REAL,
      narration_path TEXT, settings TEXT, status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY, type TEXT NOT NULL,
      source_story_id TEXT REFERENCES stories(id),
      source_video_id TEXT REFERENCES videos(id),
      caption TEXT NOT NULL, hashtags TEXT DEFAULT '[]',
      image_paths TEXT DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft',
      scheduled_for TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS print_exports (
      id TEXT PRIMARY KEY, story_id TEXT NOT NULL REFERENCES stories(id),
      pdf_path TEXT NOT NULL, cover_path TEXT, settings TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  for (const stmt of createStatements) {
    sqlite.exec(stmt);
  }
}

export { schema };
