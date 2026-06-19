import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { worlds } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

// GET /api/design/worlds
export async function GET() {
  const db = getDb();
  const all = db.select().from(worlds).all();
  return NextResponse.json(all);
}

// POST /api/design/worlds
export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();

  const world = {
    id: uuid(),
    name: body.name,
    slug: body.name.toLowerCase().replace(/\s+/g, "-"),
    description: body.description || "",
    stylePrompt: body.stylePrompt || "",
    colorPalette: body.colorPalette || [],
    referenceImages: body.referenceImages || [],
  };

  db.insert(worlds).values(world).run();
  const created = db.select().from(worlds).where(eq(worlds.id, world.id)).get();
  return NextResponse.json(created, { status: 201 });
}
