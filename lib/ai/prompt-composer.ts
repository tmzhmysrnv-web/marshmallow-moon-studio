import { getDb } from "@/lib/db";
import { characters, worlds } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface ComposedPrompt {
  text: string;
  referenceImages: string[];
  worldStylePrompt: string;
  colorPalette: string[];
}

export async function composePrompt(
  worldId: string,
  characterIds: string[],
  sceneDescription: string
): Promise<ComposedPrompt> {
  try {
    const db = getDb();

    const world = db.select().from(worlds).where(eq(worlds.id, worldId)).get();
    if (!world) throw new Error(`World not found: ${worldId}`);

    const allChars = db.select().from(characters).all();
    const characterRecords = allChars.filter((c) => characterIds.includes(c.id));

    const referenceImages: string[] = [];
    for (const char of characterRecords) {
      if (char.referenceImages && char.referenceImages.length > 0) {
        referenceImages.push(...char.referenceImages.slice(0, 3));
      }
    }

    const characterDescriptions = characterRecords
      .map((c) => c.appearancePrompt)
      .filter(Boolean);

    const promptParts = [
      world.stylePrompt,
      "",
      ...characterDescriptions.map((desc) => `Character: ${desc}`),
      "",
      `Scene: ${sceneDescription}`,
    ];

    return {
      text: promptParts.join("\n"),
      referenceImages,
      worldStylePrompt: world.stylePrompt,
      colorPalette: world.colorPalette || [],
    };
  } catch (err) {
    console.error("Prompt composer error, using fallback:", err);
    // Fallback: return a simple composed prompt without DB
    return {
      text: `Children's book illustration. Bright artsy nocturnal scene with soft glowing edges. ${sceneDescription}`,
      referenceImages: [],
      worldStylePrompt: "Bright artsy nocturnal storybook illustration with deep navy sky, warm gold highlights, silver moonlight.",
      colorPalette: ["#1a1a2e", "#fbbf24", "#bae6fd"],
    };
  }
}

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
