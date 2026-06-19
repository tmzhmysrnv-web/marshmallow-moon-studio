// ============================================================
// Prompt Composer
//
// Assembles the final illustration prompt by combining:
// - World style preset
// - Character appearance prompts
// - Character reference image URLs
// - Scene-specific illustration direction
//
// This is the engine that ensures visual consistency across
// every illustration in every story.
// ============================================================

import { getDb } from "@/lib/db";
import { characters, worlds } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface ComposedPrompt {
  text: string;
  referenceImages: string[];
  worldStylePrompt: string;
  colorPalette: string[];
}

/**
 * Compose a full illustration prompt from Design Studio data.
 *
 * @param worldId - The world/style preset to use
 * @param characterIds - Character IDs present in this scene
 * @param sceneDescription - The scene-specific illustration direction from the story
 * @returns A fully composed prompt ready for the image generation API
 */
export async function composePrompt(
  worldId: string,
  characterIds: string[],
  sceneDescription: string
): Promise<ComposedPrompt> {
  const db = getDb();

  // Fetch world
  const world = db.select().from(worlds).where(eq(worlds.id, worldId)).get();
  if (!world) throw new Error(`World not found: ${worldId}`);

  // Fetch characters
  const characterRecords = db
    .select()
    .from(characters)
    .where(
      // SQLite doesn't support IN with drizzle-orm directly for arrays in all cases
      // so we build the query differently
      undefined as any
    )
    .all()
    .filter((c) => characterIds.includes(c.id));

  // Collect reference images
  const referenceImages: string[] = [];
  for (const char of characterRecords) {
    if (char.referenceImages && char.referenceImages.length > 0) {
      referenceImages.push(...char.referenceImages.slice(0, 3));
    }
  }

  // Build character descriptions for the prompt
  const characterDescriptions = characterRecords
    .map((c) => c.appearancePrompt)
    .filter(Boolean);

  // Assemble the final prompt
  const promptParts = [
    // 1. World style (dominant, sets the scene)
    world.stylePrompt,
    "",
    // 2. Character descriptions
    ...characterDescriptions.map((desc) => `Character: ${desc}`),
    "",
    // 3. Scene-specific direction
    `Scene: ${sceneDescription}`,
  ];

  return {
    text: promptParts.join("\n"),
    referenceImages,
    worldStylePrompt: world.stylePrompt,
    colorPalette: world.colorPalette || [],
  };
}

/**
 * Compose a simple prompt without DB lookups (for testing or when data is already loaded).
 */
export function composePromptSimple(
  worldStylePrompt: string,
  characterPrompts: string[],
  characterRefImages: string[],
  sceneDescription: string
): ComposedPrompt {
  const promptParts = [
    worldStylePrompt,
    "",
    ...characterPrompts.map((desc) => `Character: ${desc}`),
    "",
    `Scene: ${sceneDescription}`,
  ];

  return {
    text: promptParts.join("\n"),
    referenceImages: characterRefImages,
    worldStylePrompt,
    colorPalette: [],
  };
}
