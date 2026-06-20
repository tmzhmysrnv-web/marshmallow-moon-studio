import { NextRequest, NextResponse } from "next/server";
import { getDb, forceBlobLoad } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseStoryScenes } from "@/lib/ai/story";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Sync from Blob before reading (ensures cross-deploy persistence)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await forceBlobLoad();
    } catch (e) {
      console.warn("Blob sync failed:", (e as Error).message);
    }
  }

  const db = getDb();
  const story = db.select().from(stories).where(eq(stories.id, id)).get();

  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const scenes = parseStoryScenes(story.content);
  return NextResponse.json({ ...story, scenes });
}
