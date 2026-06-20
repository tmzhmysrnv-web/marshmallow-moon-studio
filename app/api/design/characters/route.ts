import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { characters, worlds, stories, illustrations } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

// GET /api/design/characters — list all (auto-seeds if empty)
export async function GET() {
  try {
    const db = getDb();
    const all = db.select().from(characters).all();

    // Auto-seed from mockup data if empty
    if (all.length === 0) {
      const seedData = getSeedCharacters();
      for (const c of seedData) {
        db.insert(characters).values(c).run();
      }
      const seeded = db.select().from(characters).all();
      return NextResponse.json(seeded);
    }

    return NextResponse.json(all);
  } catch (err) {
    console.error("Characters GET error:", err);
    return NextResponse.json({ error: "Failed to fetch characters" }, { status: 500 });
  }
}

// POST /api/design/characters — create
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    const character = {
      id: uuid(),
      name: body.name,
      slug: body.name.toLowerCase().replace(/\s+/g, "-"),
      species: body.species || "",
      personalityBio: body.personalityBio || "",
      appearancePrompt: body.appearancePrompt || "",
      voiceId: body.voiceId || null,
      traits: body.traits || [],
      catchphrases: body.catchphrases || [],
      relationships: body.relationships || [],
      referenceImages: body.referenceImages || [],
    };

    db.insert(characters).values(character).run();

    const created = db.select().from(characters).where(eq(characters.id, character.id)).get();

    // Persist FULL store to Vercel Blob so new characters survive redeploy
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = await import("@vercel/blob");
        const store = {
          characters: db.select().from(characters).all(),
          worlds: db.select().from(worlds).all(),
          stories: db.select().from(stories).all(),
          illustrations: db.select().from(illustrations).all(),
        };
        await put("marshmallow-moon-store.json", JSON.stringify(store), {
          access: "public",
          contentType: "application/json",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        console.log("✓ New character persisted to Vercel Blob");
      }
    } catch (e: any) {
      console.warn("Blob persist failed:", e.message);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create character" }, { status: 500 });
  }
}

// Seed data from the Marshmallow Moon mockup
function getSeedCharacters() {
  const miloId = uuid();
  const cloverId = uuid();
  const pipId = uuid();

  return [
    {
      id: miloId,
      name: "Milo",
      slug: "milo",
      species: "Mouse",
      personalityBio:
        "Milo is an adventurous, wide-eyed young mouse with boundless curiosity. " +
        "He sees wonder in the ordinary and believes anything is possible if you climb high enough. " +
        "He carries a sturdy canvas backpack with tiny brass buckles — always prepared for an expedition. " +
        "Milo is brave but never reckless; he leads with his heart.",
      appearancePrompt:
        "A small adventurous mouse with wide expressive eyes full of wonder. " +
        "Warm brown fur, slightly lighter on the belly. " +
        "Sturdy canvas backpack with tiny brass buckles. " +
        "Small rounded ears, delicate whiskers, tiny paws. " +
        "Expression: eager, hopeful, looking upward. " +
        "Children's book illustration style, soft edges, warm lighting.",
      voiceId: null,
      traits: ["adventurous", "curious", "brave", "kind-hearted", "hopeful"],
      catchphrases: ["Let's go see!", "Just a little higher..."],
      relationships: [
        { characterId: cloverId, description: "Best friend and climbing companion" },
        { characterId: pipId, description: "Quiet friend whose light guides the way" },
      ],
      referenceImages: [],
    },
    {
      id: cloverId,
      name: "Clover",
      slug: "clover",
      species: "Caterpillar",
      personalityBio:
        "Clover is a sleepy, curious green caterpillar who never goes anywhere " +
        "without her oversized chunky-knit ivory scarf — even in summer. She moves slowly " +
        "but thinks deeply, often noticing details others rush past. Clover is the gentle " +
        "philosopher of the group, offering quiet wisdom between yawns.",
      appearancePrompt:
        "A sleepy green caterpillar with a gentle, curious expression. " +
        "Soft sage-green segmented body with tiny legs. " +
        "Oversized chunky-knit ivory scarf wrapped several times around her neck. " +
        "Half-closed drowsy eyes that still sparkle with curiosity. " +
        "Children's book illustration style, soft edges, cozy feeling.",
      voiceId: null,
      traits: ["sleepy", "wise", "gentle", "observant", "cozy"],
      catchphrases: ["Take your time...", "I was just thinking..."],
      relationships: [
        { characterId: miloId, description: "Brave friend who leads the adventures" },
        { characterId: pipId, description: "Gentle friend who lights up the night" },
      ],
      referenceImages: [],
    },
    {
      id: pipId,
      name: "Pip",
      slug: "pip",
      species: "Firefly",
      personalityBio:
        "Pip is a shy, flickering firefly whose glow pulses brighter or dimmer " +
        "depending on his emotions. When nervous, he flickers; when happy, he shines " +
        "steady and warm. He has iridescent wings that catch the moonlight. Pip is " +
        "the quiet heart of the group — he doesn't say much, but his light says everything.",
      appearancePrompt:
        "A shy, small firefly with iridescent translucent wings that shimmer " +
        "in blues, purples, and golds. His body glows with a warm golden bioluminescent " +
        "pulse that flickers when he's nervous and shines steady when he's happy. " +
        "Tiny antennae, delicate legs. Expression: bashful but warm. " +
        "Children's book illustration style, soft glowing edges, magical atmosphere.",
      voiceId: null,
      traits: ["shy", "gentle", "emotive", "luminous", "loyal"],
      catchphrases: ["*flickers softly*", "...hi."],
      relationships: [
        { characterId: miloId, description: "Adventurous friend who makes him feel brave" },
        { characterId: cloverId, description: "Cozy friend who never rushes him" },
      ],
      referenceImages: [],
    },
  ];
}
