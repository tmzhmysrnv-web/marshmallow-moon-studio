import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { worlds } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

// GET /api/design/worlds (auto-seeds if empty)
export async function GET() {
  try {
    const db = getDb();
    const all = db.select().from(worlds).all();

    // Auto-seed from mockup data if empty
    if (all.length === 0) {
      const seedData = getSeedWorld();
      db.insert(worlds).values(seedData).run();
      const seeded = db.select().from(worlds).all();
      return NextResponse.json(seeded);
    }

    return NextResponse.json(all);
  } catch (err) {
    console.error("Worlds GET error:", err);
    return NextResponse.json({ error: "Failed to fetch worlds" }, { status: 500 });
  }
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

function getSeedWorld() {
  return {
    id: uuid(),
    name: "The Nocturnal Meadow",
    slug: "nocturnal-meadow",
    description:
      "A luminous nighttime meadow beneath a vast star-flecked sky. " +
      "Rolling hills of soft grass that glow faintly in the moonlight. " +
      "The marshmallow moon hangs impossibly large and close, casting silver light " +
      "across the landscape. Fireflies dance in the tall grass. " +
      "The air is warm and still, carrying the scent of night-blooming flowers. " +
      "A place where small creatures have big adventures.",
    stylePrompt:
      "Bright artsy nocturnal storybook illustration. " +
      "Deep navy night sky with scattered twinkling stars. " +
      "Warm golden bioluminescent glow from fireflies and magical light sources. " +
      "Silver moonlight rim-lighting on characters and landscape. " +
      "Soft glowing edges throughout, not photorealistic. " +
      "Cinematic composition with depth and atmosphere. " +
      "Color palette: deep purples (#1a1a2e), warm golds (#fbbf24), cool silvers (#bae6fd). " +
      "Cozy tactile details. Playful but atmospheric. " +
      "The marshmallow moon should appear soft, luminous, textured like a real marshmallow " +
      "but impossibly large in the sky.",
    colorPalette: ["#1a1a2e", "#16213e", "#fbbf24", "#f59e0b", "#bae6fd", "#7dd3fc", "#e0e7ff", "#c7d2fe"],
    referenceImages: [],
  };
}
