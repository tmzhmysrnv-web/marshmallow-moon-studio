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

    // Fetch characters and world from Design Studio
    const characterIds: string[] = body.characterIds || [];
    const worldId: string = body.worldId || "";

    const characterRecords = characterIds.length > 0
      ? db.select().from(characters).all().filter((c) => characterIds.includes(c.id))
      : db.select().from(characters).all();

    const world = worldId
      ? db.select().from(worlds).where(eq(worlds.id, worldId)).get()
      : db.select().from(worlds).get();

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

    // Generate the story
    const rawContent = await generateStory({
      title: body.title || "A Marshmallow Moon Adventure",
      ageRange: body.ageRange || "4-8",
      theme: body.theme || "friendship and wonder",
      length: body.length || "short",
      characters: characterRecords.map((c) => ({
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

    // Parse scenes
    const scenes = parseStoryScenes(rawContent);

    // Save story
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
  } catch (err: any) {
    console.error("Story generation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate story" },
      { status: 500 }
    );
  }
}
