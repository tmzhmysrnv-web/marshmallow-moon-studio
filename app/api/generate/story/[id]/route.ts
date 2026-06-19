import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseStoryScenes } from "@/lib/ai/story";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const story = db.select().from(stories).where(eq(stories.id, id)).get();
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const scenes = parseStoryScenes(story.content);
  return NextResponse.json({ ...story, scenes });
}
