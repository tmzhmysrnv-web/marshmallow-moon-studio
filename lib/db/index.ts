// ============================================================
// Storage — SQLite locally, in-memory + Vercel Blob on serverless
// ============================================================

import path from "path";
import fs from "fs";

// In-memory store
interface InMemoryStore {
  characters: any[];
  worlds: any[];
  stories: any[];
  illustrations: any[];
  videos: any[];
  socialPosts: any[];
  printExports: any[];
}

declare global {
  var __marshmallowStore: InMemoryStore | undefined;
}

function getStore(): InMemoryStore {
  if (!globalThis.__marshmallowStore) {
    globalThis.__marshmallowStore = {
      characters: [],
      worlds: [],
      stories: [],
      illustrations: [],
      videos: [],
      socialPosts: [],
      printExports: [],
    };
    // Load from Vercel Blob asynchronously
    loadFromBlob();
  }
  return globalThis.__marshmallowStore;
}

// Vercel Blob persistence
const BLOB_PATH = "marshmallow-moon-store.json";
let blobToken: string | null = null;

async function getBlobToken(): Promise<string | null> {
  if (blobToken) return blobToken;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    return blobToken;
  }
  return null;
}

async function loadFromBlob() {
  try {
    const token = await getBlobToken();
    if (!token) return;

    const { list, del } = await import("@vercel/blob");
    const { blobs } = await list({ token });
    const existing = blobs.find((b) => b.pathname === BLOB_PATH);
    if (!existing) return;

    const response = await fetch(existing.url);
    const data = await response.json();
    if (data && typeof data === "object") {
      const store = getStore();
      for (const key of Object.keys(store) as (keyof InMemoryStore)[]) {
        if (Array.isArray(data[key])) {
          store[key] = data[key];
        }
      }
      console.log("✓ Loaded from Vercel Blob:", Object.values(data).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0), "records");
    }
  } catch (e) {
    console.warn("Blob load failed, using in-memory:", (e as Error).message);
  }
}

async function saveToBlob() {
  try {
    const token = await getBlobToken();
    if (!token) return;

    const { put } = await import("@vercel/blob");
    const store = getStore();
    await put(BLOB_PATH, JSON.stringify(store), {
      access: "public",
      contentType: "application/json",
      token,
    });
  } catch (e) {
    console.warn("Blob save failed:", (e as Error).message);
  }
}

function persistAfterMutation() {
  saveToBlob().catch(() => {});
}

// Simple in-memory query builder
function createQuery<T>(table: keyof InMemoryStore) {
  const store = getStore();
  return {
    all: (): T[] => [...store[table]],
    get: (): T | undefined => store[table][0],
    where: (field: string, value: string) => ({
      all: (): T[] => store[table].filter((r: any) => r[field] === value),
      get: (): T | undefined => store[table].find((r: any) => r[field] === value),
    }),
    values: (records: any[]) => {
      store[table].push(...records);
      return { run: () => {} };
    },
  };
}

function createInsert(table: keyof InMemoryStore) {
  return {
    values: (record: any) => ({
      run: () => {
        getStore()[table].push(record);
        persistAfterMutation();
      },
    }),
  };
}

function createUpdate(table: keyof InMemoryStore) {
  return {
    set: (data: any) => ({
      where: (_field: string, _value: string) => ({
        run: () => {
          const idx = getStore()[table].findIndex((r: any) => r.id === _value);
          if (idx >= 0) {
            getStore()[table][idx] = { ...getStore()[table][idx], ...data };
            persistAfterMutation();
          }
        },
      }),
    }),
  };
}

function createDelete(table: keyof InMemoryStore) {
  return {
    where: (_field: string, _value: string) => ({
      run: () => {
        getStore()[table] = getStore()[table].filter((r: any) => r[_field] !== _value);
        persistAfterMutation();
      },
    }),
  };
}

// Try real SQLite, fall back to in-memory
let useInMemory = false;

function isVercel(): boolean {
  return !!(process.env.VERCEL || process.env.VERCEL_ENV);
}

export function getDb(): any {
  if (!useInMemory) {
    try {
      // Try native SQLite for local dev
      const Database = require("better-sqlite3");
      const { drizzle: drizzleFactory } = require("drizzle-orm/better-sqlite3");
      const schema = require("./schema");

      const dbPath = isVercel()
        ? path.join("/tmp", "marshmallow-moon.db")
        : path.resolve("data", "marshmallow-moon.db");

      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const sqlite = new Database(dbPath);
      sqlite.pragma("journal_mode = WAL");
      sqlite.pragma("foreign_keys = ON");

      // Ensure tables exist
      const tables = [
        `CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, species TEXT NOT NULL, personality_bio TEXT NOT NULL, appearance_prompt TEXT NOT NULL, voice_id TEXT, traits TEXT DEFAULT '[]', catchphrases TEXT DEFAULT '[]', relationships TEXT DEFAULT '[]', reference_images TEXT DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS worlds (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, description TEXT NOT NULL, style_prompt TEXT NOT NULL, color_palette TEXT DEFAULT '[]', reference_images TEXT DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS stories (id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, content TEXT NOT NULL, age_range TEXT NOT NULL DEFAULT '4-8', theme TEXT DEFAULT '', character_ids TEXT DEFAULT '[]', world_id TEXT, status TEXT NOT NULL DEFAULT 'draft', page_count INTEGER DEFAULT 6, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS illustrations (id TEXT PRIMARY KEY, story_id TEXT NOT NULL, character_ids TEXT DEFAULT '[]', world_id TEXT, page_number INTEGER NOT NULL, prompt TEXT NOT NULL, image_path TEXT NOT NULL, thumbnail_path TEXT, "order" INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'generated', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS videos (id TEXT PRIMARY KEY, story_id TEXT NOT NULL, video_path TEXT NOT NULL, thumbnail_path TEXT, duration REAL, narration_path TEXT, settings TEXT, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS social_posts (id TEXT PRIMARY KEY, type TEXT NOT NULL, source_story_id TEXT, source_video_id TEXT, caption TEXT NOT NULL, hashtags TEXT DEFAULT '[]', image_paths TEXT DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft', scheduled_for TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
        `CREATE TABLE IF NOT EXISTS print_exports (id TEXT PRIMARY KEY, story_id TEXT NOT NULL, pdf_path TEXT NOT NULL, cover_path TEXT, settings TEXT, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
      ];
      for (const t of tables) sqlite.exec(t);

      console.log("✓ Using native SQLite storage");
      return drizzleFactory(sqlite, { schema });
    } catch (e) {
      console.warn("Native SQLite unavailable, using in-memory storage:", (e as Error).message);
      useInMemory = true;
    }
  }

  // Fallback: in-memory storage
  console.log("✓ Using in-memory storage");
  return {
    select: () => ({
      from: (table: any) => {
        const tableName = (table as any)?.name || "";
        const map: Record<string, keyof InMemoryStore> = {
          characters: "characters",
          worlds: "worlds",
          stories: "stories",
          illustrations: "illustrations",
          videos: "videos",
          social_posts: "socialPosts",
          print_exports: "printExports",
        };
        const key = map[tableName] || "characters";
        return createQuery(key);
      },
    }),
    insert: (table: any) => {
      const tableName = (table as any)?.name || "";
      const map: Record<string, keyof InMemoryStore> = {
        characters: "characters",
        worlds: "worlds",
        stories: "stories",
        illustrations: "illustrations",
        videos: "videos",
        social_posts: "socialPosts",
        print_exports: "printExports",
      };
      return createInsert(map[tableName] || "characters");
    },
    update: (table: any) => {
      const tableName = (table as any)?.name || "";
      const map: Record<string, keyof InMemoryStore> = {
        characters: "characters",
        worlds: "worlds",
        stories: "stories",
        illustrations: "illustrations",
        videos: "videos",
        social_posts: "socialPosts",
        print_exports: "printExports",
      };
      return createUpdate(map[tableName] || "characters");
    },
    delete: (table: any) => {
      const tableName = (table as any)?.name || "";
      const map: Record<string, keyof InMemoryStore> = {
        characters: "characters",
        worlds: "worlds",
        stories: "stories",
        illustrations: "illustrations",
        videos: "videos",
        social_posts: "socialPosts",
        print_exports: "printExports",
      };
      return createDelete(map[tableName] || "characters");
    },
  };
}

export function getSqlite() {
  return null; // Only used for native SQLite migration
}

export const schema = {};
