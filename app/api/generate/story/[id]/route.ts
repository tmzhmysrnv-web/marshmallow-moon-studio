import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { stories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseStoryScenes } from "@/lib/ai/story";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  let story = db.select().from(stories).where(eq(stories.id, id)).get();

  // If not in memory, try loading from Vercel Blob
  if (!story && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
      const existing = blobs.find((b: any) => b.pathname === "marshmallow-moon-store.json");
      if (existing) {
        const response = await fetch(existing.url);
        const data = await response.json();
        if (data?.stories) {
          story = data.stories.find((s: any) => s.id === id);
        }
      }
    } catch (e) {
      console.warn("Blob lookup failed:", (e as Error).message);
    }
  }

  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const scenes = parseStoryScenes(story.content);
  return NextResponse.json({ ...story, scenes });
}
