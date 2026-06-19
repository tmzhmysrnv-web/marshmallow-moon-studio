import { NextRequest, NextResponse } from "next/server";
import { generateStory, parseStoryScenes } from "@/lib/ai/story";
import { getDb } from "@/lib/db";
import { stories, characters, worlds } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

// GET /api/generate/story — list all stories
export async function GET() {
  const db = getDb();
  const all = db.select().from(stories).all();
  return NextResponse.json(all);
}

// POST /api/generate/story — generate a new story
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    // Fetch characters and world from Design Studio (auto-seed if empty)
    const characterIds: string[] = body.characterIds || [];
    const worldId: string = body.worldId || "";

    // Auto-seed directly (don't call other APIs — they're different serverless instances)
    if (allChars.length === 0) {
      const { v4: uuid } = await import("uuid");
      const miloId = uuid();
      const cloverId = uuid();
      const pipId = uuid();
      db.insert(characters).values([
        { id: miloId, name: "Milo", slug: "milo", species: "Mouse", personalityBio: "Milo is an adventurous, wide-eyed young mouse.", appearancePrompt: "Small adventurous mouse with wide eyes. Canvas backpack with brass buckles.", voiceId: null, traits: ["adventurous","curious","brave"], catchphrases: ["Let's go see!"], relationships: [{characterId: cloverId, description: "Best friend"}], referenceImages: [] },
        { id: cloverId, name: "Clover", slug: "clover", species: "Caterpillar", personalityBio: "Clover is a sleepy, curious green caterpillar.", appearancePrompt: "Sleepy green caterpillar with oversized ivory scarf.", voiceId: null, traits: ["sleepy","wise","gentle"], catchphrases: ["Take your time..."], relationships: [{characterId: miloId, description: "Brave friend"}], referenceImages: [] },
        { id: pipId, name: "Pip", slug: "pip", species: "Firefly", personalityBio: "Pip is a shy, flickering firefly.", appearancePrompt: "Shy firefly with iridescent wings and warm golden glow.", voiceId: null, traits: ["shy","gentle","luminous"], catchphrases: ["*flickers softly*"], relationships: [{characterId: miloId, description: "Adventurous friend"}], referenceImages: [] },
      ]).run();
      allChars = db.select().from(characters).all();
    }

    let world = worldId
      ? db.select().from(worlds).where(eq(worlds.id, worldId)).get()
      : null;

    // Auto-seed world if empty
    if (!world) {
      const allWorlds = db.select().from(worlds).all();
      if (allWorlds.length === 0) {
        const { v4: uuid } = await import("uuid");
        const worldId2 = uuid();
        db.insert(worlds).values({
          id: worldId2, name: "The Nocturnal Meadow", slug: "nocturnal-meadow",
          description: "A luminous nighttime meadow beneath a vast star-flecked sky.",
          stylePrompt: "Bright artsy nocturnal storybook illustration. Deep navy night sky. Warm golden glow. Silver moonlight rim-lighting. Soft glowing edges.",
          colorPalette: ["#1a1a2e","#fbbf24","#bae6fd"], referenceImages: [],
        }).run();
        const seededWorlds = db.select().from(worlds).all();
        if (seededWorlds.length > 0) world = seededWorlds[0];
      } else {
        world = allWorlds[0];
      }
    }

    const characterRecords = characterIds.length > 0
      ? allChars.filter((c: any) => characterIds.includes(c.id))
      : allChars;

    if (characterRecords.length === 0) {
      return NextResponse.json(
        { error: "No characters found. Seed the database or create characters first." },
        { status: 400 }
      );
    }

    if (!world) {
      return NextResponse.json(
        { error: "No world found. Seed the database or create a world first." },
        { status: 400 }
      );
    }

    return generateStoryResponse(req, body, characterRecords, world);
  } catch (err: any) {
    console.error("Story generation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate story" },
      { status: 500 }
    );
  }
}

async function generateStoryResponse(
  req: NextRequest,
  body: any,
  characterRecords: any[],
  world: any
) {
  const db = getDb();

  const rawContent = await generateStory({
    title: body.title || "A Marshmallow Moon Adventure",
    ageRange: body.ageRange || "4-8",
    theme: body.theme || "friendship and wonder",
    length: body.length || "short",
    characters: characterRecords.map((c: any) => ({
      name: c.name,
      species: c.species,
      personalityBio: c.personalityBio,
      traits: c.traits ?? [],
      catchphrases: c.catchphrases ?? [],
    })),
    world: {
      name: world.name,
      description: world.description,
      stylePrompt: world.stylePrompt,
    },
    additionalNotes: body.additionalNotes,
  });

  const scenes = parseStoryScenes(rawContent);
  const characterIds: string[] = characterRecords.map((c: any) => c.id);

  const story = {
    id: uuid(),
    title: body.title || "A Marshmallow Moon Adventure",
    slug: (body.title || "marshmallow-moon-adventure").toLowerCase().replace(/\s+/g, "-"),
    content: rawContent,
    ageRange: body.ageRange || "4-8",
    theme: body.theme || "friendship and wonder",
    characterIds,
    worldId: world.id,
    status: "draft",
    pageCount: scenes.length,
  };

  db.insert(stories).values(story).run();

  const created = db.select().from(stories).where(eq(stories.id, story.id)).get();

  return NextResponse.json({
    ...created,
    scenes,
    characters: characterRecords,
    world,
  }, { status: 201 });
}
