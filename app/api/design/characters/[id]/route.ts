import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/design/characters/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const character = db.select().from(characters).where(eq(characters.id, id)).get();
  if (!character) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(character);
}

// PUT /api/design/characters/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  const existing = db.select().from(characters).where(eq(characters.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.update(characters)
    .set({
      name: body.name ?? existing.name,
      slug: body.name ? body.name.toLowerCase().replace(/\s+/g, "-") : existing.slug,
      species: body.species ?? existing.species,
      personalityBio: body.personalityBio ?? existing.personalityBio,
      appearancePrompt: body.appearancePrompt ?? existing.appearancePrompt,
      voiceId: body.voiceId ?? existing.voiceId,
      traits: body.traits ?? existing.traits,
      catchphrases: body.catchphrases ?? existing.catchphrases,
      relationships: body.relationships ?? existing.relationships,
      referenceImages: body.referenceImages ?? existing.referenceImages,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(characters.id, id))
    .run();

  const updated = db.select().from(characters).where(eq(characters.id, id)).get();
  return NextResponse.json(updated);
}

// DELETE /api/design/characters/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.delete(characters).where(eq(characters.id, id)).run();
  return NextResponse.json({ success: true });
}
