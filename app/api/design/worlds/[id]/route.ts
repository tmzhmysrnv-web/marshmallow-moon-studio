import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { worlds } from "@/lib/db/schema";
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
