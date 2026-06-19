import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { videos, stories, illustrations } from "@/lib/db/schema";
import { generateNarration } from "@/lib/ai/narration";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";

// GET /api/generate/video — list videos
export async function GET() {
  const db = getDb();
  const all = db.select().from(videos).all();
  return NextResponse.json(all);
}

// POST /api/generate/video — assemble a narrated slideshow
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storyId } = body;

    if (!storyId) {
      return NextResponse.json({ error: "storyId required" }, { status: 400 });
    }

    const db = getDb();

    // Fetch story
    const story = db.select().from(stories).where(eq(stories.id, storyId)).get();
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Fetch illustrations for this story (sorted by page number)
    const illData = db
      .select()
      .from(illustrations)
      .where(eq(illustrations.storyId, storyId))
      .all()
      .sort((a, b) => a.order - b.order);

    if (illData.length === 0) {
      return NextResponse.json(
        { error: "No illustrations found for this story. Generate illustrations first." },
        { status: 400 }
      );
    }

    // Parse story scenes to get narration text
    const { parseStoryScenes } = await import("@/lib/ai/story");
    const scenes = parseStoryScenes(story.content);

    // Generate narration for each scene with illustration
    const audioDir = path.resolve("data", "narration");
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const clipData: {
      pageNumber: number;
      imagePath: string;
      audioPath: string | null;
      narrative: string;
    }[] = [];

    for (const ill of illData) {
      const scene = scenes.find((s) => s.sceneNumber === ill.pageNumber);
      if (!scene) continue;

      let audioPath: string | null = null;

      // Generate narration if ELEVENLABS_API_KEY is set
      if (process.env.ELEVENLABS_API_KEY) {
        try {
          const audioBuffer = await generateNarration({
            text: scene.narrative,
          });
          const audioFilename = `${uuid()}.mp3`;
          const fullAudioPath = path.join(audioDir, audioFilename);
          fs.writeFileSync(fullAudioPath, audioBuffer);
          audioPath = `/data/narration/${audioFilename}`;
        } catch (err) {
          console.warn(`Narration generation failed for scene ${ill.pageNumber}:`, err);
        }
      }

      clipData.push({
        pageNumber: ill.pageNumber,
        imagePath: ill.imagePath,
        audioPath,
        narrative: scene.narrative,
      });
    }

    // Sort by page number
    clipData.sort((a, b) => a.pageNumber - b.pageNumber);

    // Create video manifest (JSON file describing the slideshow)
    const videoDir = path.resolve("data", "videos");
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    const videoId = uuid();
    const manifestPath = path.join(videoDir, `${videoId}.json`);
    const manifest = {
      id: videoId,
      storyId,
      title: story.title,
      clips: clipData,
      settings: {
        kenBurnsEnabled: true,
        transitionDuration: 1000, // ms
        backgroundColor: "#0f172a",
      },
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Save to database
    const video = {
      id: videoId,
      storyId,
      videoPath: `/data/videos/${videoId}.json`,
      narrationPath: clipData.some((c) => c.audioPath) ? audioDir : null,
      duration: clipData.length * 5, // estimate 5s per clip
      settings: manifest.settings,
      status: "draft",
    };

    db.insert(videos).values(video).run();

    return NextResponse.json(
      {
        ...video,
        clipCount: clipData.length,
        hasNarration: clipData.some((c) => c.audioPath),
        manifest,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Video assembly error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
