import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

// GET /api/design/characters — list all
export async function GET() {
  try {
    const db = getDb();
    const all = db.select().from(characters).all();
    return NextResponse.json(all);
  } catch (err) {
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

    // Return the created character with seed data loaded
    const created = db.select().from(characters).where(eq(characters.id, character.id)).get();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create character" }, { status: 500 });
  }
}
