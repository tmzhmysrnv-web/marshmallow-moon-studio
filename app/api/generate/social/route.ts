import { NextRequest, NextResponse } from "next/server";
import { generateSocialContent } from "@/lib/ai/social";
import { getDb } from "@/lib/db";
import { socialPosts, stories } from "@/lib/db/schema";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";

// GET /api/generate/social — list social posts
export async function GET() {
  const db = getDb();
  const all = db.select().from(socialPosts).all();
  return NextResponse.json(all);
}

// POST /api/generate/social — generate social content
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, storyId, tone } = body;

    if (!storyId || !type) {
      return NextResponse.json({ error: "storyId and type required" }, { status: 400 });
    }

    const db = getDb();
    const story = db.select().from(stories).where(eq(stories.id, storyId)).get();
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Get first 200 chars as excerpt
    const excerpt = story.content.substring(0, 200).replace(/\*\*/g, "").replace(/\*/g, "");

    const content = await generateSocialContent({
      type: type || "carousel",
      storyTitle: story.title,
      storyExcerpt: excerpt,
      characterNames: [], // Could load from DB
      tone: tone || "whimsical",
    });

    // Save to DB
    const post = {
      id: uuid(),
      type: type || "carousel",
      sourceStoryId: storyId,
      caption: content.caption || "",
      hashtags: content.hashtags || [],
      imagePaths: [],
      status: "draft",
    };

    db.insert(socialPosts).values(post).run();

    const created = db.select().from(socialPosts).where(eq(socialPosts.id, post.id)).get();
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Social generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
