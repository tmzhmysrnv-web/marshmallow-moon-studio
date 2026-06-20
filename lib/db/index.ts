// ============================================================
// Storage — SQLite locally, in-memory + persistent on serverless
// ============================================================

import path from "path";
import fs from "fs";

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

const BLOB_PATH = "marshmallow-moon-store.json";

function getPersistPath(): string {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return path.join("/tmp", BLOB_PATH);
  }
  return path.resolve("data", BLOB_PATH);
}

// Load from Vercel Blob (preferred) or JSON file (fallback)
async function loadPersisted(): Promise<InMemoryStore | null> {
  // Try Vercel Blob first
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
      const existing = blobs.find((b: any) => b.pathname === BLOB_PATH);
      if (existing) {
        const response = await fetch(existing.url);
        const data = await response.json();
        if (data && typeof data === "object") {
          console.log("✓ Loaded from Vercel Blob:", 
            Object.values(data).reduce((s: number, a: any) => s + (a?.length || 0), 0), "records");
          return {
            characters: data.characters || [],
            worlds: data.worlds || [],
            stories: data.stories || [],
            illustrations: data.illustrations || [],
            videos: data.videos || [],
            socialPosts: data.socialPosts || [],
            printExports: data.printExports || [],
          };
        }
      }
    } catch (e) {
      console.warn("Vercel Blob load failed:", (e as Error).message);
    }
  }

  // Fall back to JSON file
  try {
    const filePath = getPersistPath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        console.log("✓ Loaded from JSON file:", 
          Object.values(data).reduce((s: number, a: any) => s + (a?.length || 0), 0), "records");
        return {
          characters: data.characters || [],
          worlds: data.worlds || [],
          stories: data.stories || [],
          illustrations: data.illustrations || [],
          videos: data.videos || [],
          socialPosts: data.socialPosts || [],
          printExports: data.printExports || [],
        };
      }
    }
  } catch (e) {
    console.warn("JSON file load failed:", (e as Error).message);
  }

  return null;
}

async function savePersisted() {
  const store = getStore();

  // Try Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      await put(BLOB_PATH, JSON.stringify(store), {
        access: "public",
        contentType: "application/json",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      console.log("✓ Saved to Vercel Blob");
      return;
    } catch (e) {
      console.warn("Vercel Blob save failed:", (e as Error).message);
    }
  }

  // Fall back to JSON file
  try {
    const filePath = getPersistPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2));
    console.log("✓ Saved to JSON file");
  } catch (e) {
    console.warn("JSON file save failed:", (e as Error).message);
  }
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
    // Async load in background
    loadPersisted().then((data) => {
      if (data) globalThis.__marshmallowStore = data;
    });
  }
  return globalThis.__marshmallowStore;
}

function persistAfterMutation() {
  savePersisted();
}

// Export for API routes that need to await persistence
// Also used to load from Blob into in-memory store
export async function forceBlobPersist() {
  await savePersisted();
}

export async function forceBlobLoad(): Promise<InMemoryStore> {
  const persisted = await loadPersisted();
  if (persisted) {
    // Merge into global store
    const store = getStore();
    for (const key of Object.keys(persisted) as (keyof InMemoryStore)[]) {
      store[key] = persisted[key];
    }
    console.log("✓ Store synced from Blob");
  }
  return getStore();
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
