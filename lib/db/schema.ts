import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ============================================================
// Design Studio — Characters
// ============================================================
export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  species: text("species").notNull(),
  personalityBio: text("personality_bio").notNull(),
  appearancePrompt: text("appearance_prompt").notNull(),
  voiceId: text("voice_id"),
  traits: text("traits", { mode: "json" }).$type<string[]>().default([]),
  catchphrases: text("catchphrases", { mode: "json" }).$type<string[]>().default([]),
  relationships: text("relationships", { mode: "json" })
    .$type<{ characterId: string; description: string }[]>()
    .default([]),
  referenceImages: text("reference_images", { mode: "json" })
    .$type<string[]>()
    .default([]),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================
// Design Studio — Worlds
// ============================================================
export const worlds = sqliteTable("worlds", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  stylePrompt: text("style_prompt").notNull(),
  colorPalette: text("color_palette", { mode: "json" }).$type<string[]>().default([]),
  referenceImages: text("reference_images", { mode: "json" })
    .$type<string[]>()
    .default([]),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================
// Stories
// ============================================================
export const stories = sqliteTable("stories", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  ageRange: text("age_range").notNull().default("4-8"),
  theme: text("theme").default(""),
  characterIds: text("character_ids", { mode: "json" })
    .$type<string[]>()
    .default([]),
  worldId: text("world_id").references(() => worlds.id),
  status: text("status").notNull().default("draft"), // draft | complete
  pageCount: integer("page_count").default(6),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================
// Illustrations
// ============================================================
export const illustrations = sqliteTable("illustrations", {
  id: text("id").primaryKey(),
  storyId: text("story_id")
    .notNull()
    .references(() => stories.id),
  characterIds: text("character_ids", { mode: "json" })
    .$type<string[]>()
    .default([]),
  worldId: text("world_id").references(() => worlds.id),
  pageNumber: integer("page_number").notNull(),
  prompt: text("prompt").notNull(),
  imagePath: text("image_path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  order: integer("order").notNull().default(0),
  status: text("status").notNull().default("generated"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================
// Videos
// ============================================================
export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(),
  storyId: text("story_id")
    .notNull()
    .references(() => stories.id),
  videoPath: text("video_path").notNull(),
  thumbnailPath: text("thumbnail_path"),
  duration: real("duration"),
  narrationPath: text("narration_path"),
  settings: text("settings", { mode: "json" }).$type<{
    kenBurnsEnabled: boolean;
    transitionDuration: number;
    backgroundColor: string;
  }>(),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================
// Social Posts
// ============================================================
export const socialPosts = sqliteTable("social_posts", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // carousel | reel | story
  sourceStoryId: text("source_story_id").references(() => stories.id),
  sourceVideoId: text("source_video_id").references(() => videos.id),
  caption: text("caption").notNull(),
  hashtags: text("hashtags", { mode: "json" }).$type<string[]>().default([]),
  imagePaths: text("image_paths", { mode: "json" }).$type<string[]>().default([]),
  status: text("status").notNull().default("draft"),
  scheduledFor: text("scheduled_for"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================
// Print Exports
// ============================================================
export const printExports = sqliteTable("print_exports", {
  id: text("id").primaryKey(),
  storyId: text("story_id")
    .notNull()
    .references(() => stories.id),
  pdfPath: text("pdf_path").notNull(),
  coverPath: text("cover_path"),
  settings: text("settings", { mode: "json" }).$type<{
    trimWidth: number;
    trimHeight: number;
    bleedMm: number;
    pageCount: number;
    includeCover: boolean;
  }>(),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
