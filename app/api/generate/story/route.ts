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
    const characterIds: string[] = body.characterIds || [];
    const worldId: string = body.worldId || "";

    // Auto-seed characters and worlds if needed
    let allChars = db.select().from(characters).all();
    let world = worldId
      ? db.select().from(worlds).where(eq(worlds.id, worldId)).get()
      : null;

    // Seed characters
    if (allChars.length === 0) {
      const miloId = uuid();
      const cloverId = uuid();
      const pipId = uuid();
      db.insert(characters).values([
        { id: miloId, name: "Milo", slug: "milo", species: "Mouse",
          personalityBio: "Milo is an adventurous, wide-eyed young mouse with boundless curiosity. He carries a sturdy canvas backpack with tiny brass buckles.",
          appearancePrompt: "Small adventurous mouse with wide expressive eyes. Warm brown fur. Sturdy canvas backpack with tiny brass buckles. Expression: eager, hopeful.",
          voiceId: null, traits: ["adventurous","curious","brave","kind-hearted","hopeful"],
          catchphrases: ["Let's go see!","Just a little higher..."],
          relationships: [{characterId: cloverId, description: "Best friend"}, {characterId: pipId, description: "Quiet friend"}],
          referenceImages: [] },
        { id: cloverId, name: "Clover", slug: "clover", species: "Caterpillar",
          personalityBio: "Clover is a sleepy, curious green caterpillar who never goes anywhere without her oversized chunky-knit ivory scarf.",
          appearancePrompt: "Sleepy green caterpillar with gentle, curious expression. Oversized chunky-knit ivory scarf. Soft sage-green segmented body.",
          voiceId: null, traits: ["sleepy","wise","gentle","observant","cozy"],
          catchphrases: ["Take your time...","I was just thinking..."],
          relationships: [{characterId: miloId, description: "Brave friend"}, {characterId: pipId, description: "Gentle friend"}],
          referenceImages: [] },
        { id: pipId, name: "Pip", slug: "pip", species: "Firefly",
          personalityBio: "Pip is a shy, flickering firefly whose glow pulses brighter or dimmer depending on his emotions. He has iridescent wings.",
          appearancePrompt: "Shy small firefly with iridescent translucent wings. Warm golden bioluminescent pulse. Expression: bashful but warm.",
          voiceId: null, traits: ["shy","gentle","emotive","luminous","loyal"],
          catchphrases: ["*flickers softly*","...hi."],
          relationships: [{characterId: miloId, description: "Adventurous friend"}, {characterId: cloverId, description: "Cozy friend"}],
          referenceImages: [] },
      ]).run();
      allChars = db.select().from(characters).all();
    }

    // Seed world
    if (!world) {
      const allWorlds = db.select().from(worlds).all();
      if (allWorlds.length > 0) {
        world = allWorlds[0];
      } else {
        const newWorldId = uuid();
        db.insert(worlds).values({
          id: newWorldId, name: "The Nocturnal Meadow", slug: "nocturnal-meadow",
          description: "A luminous nighttime meadow beneath a vast star-flecked sky. The marshmallow moon hangs impossibly large and close. Fireflies dance in the tall grass.",
          stylePrompt: "Bright artsy nocturnal storybook illustration. Deep navy night sky with scattered twinkling stars. Warm golden bioluminescent glow. Silver moonlight rim-lighting. Soft glowing edges. Cinematic composition. The marshmallow moon appears soft, luminous, impossibly large.",
          colorPalette: ["#1a1a2e","#16213e","#fbbf24","#f59e0b","#bae6fd","#7dd3fc","#e0e7ff","#c7d2fe"],
          referenceImages: [],
        }).run();
        const seeded = db.select().from(worlds).all();
        if (seeded.length > 0) world = seeded[0];
      }
    }

    // Filter characters
    const characterRecords = characterIds.length > 0
      ? allChars.filter((c: any) => characterIds.includes(c.id))
      : allChars;

    if (characterRecords.length === 0) {
      return NextResponse.json({ error: "No characters found." }, { status: 400 });
    }
    if (!world) {
      return NextResponse.json({ error: "No world found." }, { status: 400 });
    }

    // Generate story
    const rawContent = await generateStory({
      title: body.title || "A Marshmallow Moon Adventure",
      ageRange: body.ageRange || "4-8",
      theme: body.theme || "friendship and wonder",
      length: body.length || "short",
      characters: characterRecords.map((c: any) => ({
        name: c.name, species: c.species, personalityBio: c.personalityBio,
        traits: c.traits ?? [], catchphrases: c.catchphrases ?? [],
      })),
      world: { name: world.name, description: world.description, stylePrompt: world.stylePrompt },
      additionalNotes: body.additionalNotes,
    });

    const scenes = parseStoryScenes(rawContent);

    const story = {
      id: uuid(),
      title: body.title || "A Marshmallow Moon Adventure",
      slug: (body.title || "marshmallow-moon-adventure").toLowerCase().replace(/\s+/g, "-"),
      content: rawContent, ageRange: body.ageRange || "4-8",
      theme: body.theme || "friendship and wonder",
      characterIds, worldId: world.id, status: "draft", pageCount: scenes.length,
    };

    db.insert(stories).values(story).run();
    const created = db.select().from(stories).where(eq(stories.id, story.id)).get();

    // Synchronously persist to Vercel Blob (so other functions can see this story)
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { put, list } = await import("@vercel/blob");
        const store = {
          characters: db.select().from(characters).all(),
          worlds: db.select().from(worlds).all(),
          stories: db.select().from(stories).all(),
        };
        await put("marshmallow-moon-store.json", JSON.stringify(store), {
          access: "public",
          contentType: "application/json",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        console.log("✓ Story persisted to Vercel Blob");
      }
    } catch (e) {
      console.warn("Blob persist failed:", (e as Error).message);
    }

    return NextResponse.json({ ...created, scenes, characters: characterRecords, world }, { status: 201 });
  } catch (err: any) {
    console.error("Story generation error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate story" }, { status: 500 });
  }
}
