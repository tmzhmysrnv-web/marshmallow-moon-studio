import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { worlds, characters, stories, illustrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/design/worlds/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const world = db.select().from(worlds).where(eq(worlds.id, id)).get();
  if (!world) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(world);
}

// PUT /api/design/worlds/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  const existing = db.select().from(worlds).where(eq(worlds.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.update(worlds)
    .set({
      name: body.name ?? existing.name,
      slug: body.name ? body.name.toLowerCase().replace(/\s+/g, "-") : existing.slug,
      description: body.description ?? existing.description,
      stylePrompt: body.stylePrompt ?? existing.stylePrompt,
      colorPalette: body.colorPalette ?? existing.colorPalette,
      referenceImages: body.referenceImages ?? existing.referenceImages,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(worlds.id, id))
    .run();

  const updated = db.select().from(worlds).where(eq(worlds.id, id)).get();

  // Persist FULL store to Vercel Blob so world changes survive redeploy
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
      console.log("✓ World update persisted to Vercel Blob");
    }
  } catch (e: any) {
    console.warn("Blob persist failed:", e.message);
  }

  return NextResponse.json(updated);
}

// DELETE /api/design/worlds/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.delete(worlds).where(eq(worlds.id, id)).run();
  return NextResponse.json({ success: true });
}
