import { NextRequest, NextResponse } from "next/server";
import { getDb, forceBlobLoad } from "@/lib/db";
import { illustrations, stories, characters, worlds } from "@/lib/db/schema";
import { composePrompt } from "@/lib/ai/prompt-composer";
import { generateIllustration } from "@/lib/ai/illustration";
import { v4 as uuid } from "uuid";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";

// GET /api/generate/illustration — list all illustrations, optionally filtered by story
export async function GET(req: NextRequest) {
  // Sync from Blob before reading
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await forceBlobLoad();
    } catch (e) {
      console.warn("Blob sync failed:", (e as Error).message);
    }
  }

  const db = getDb();
  const storyId = req.nextUrl.searchParams.get("storyId");

  let result;
  if (storyId) {
    result = db.select().from(illustrations).where(eq(illustrations.storyId, storyId)).all();
  } else {
    result = db.select().from(illustrations).all();
  }

  return NextResponse.json(result);
}

// POST /api/generate/illustration — generate an illustration for a story scene
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storyId, worldId, characterIds, sceneDescription, pageNumber, order, model } = body;

    if (!storyId || !worldId || !sceneDescription) {
      return NextResponse.json(
        { error: "storyId, worldId, and sceneDescription are required" },
        { status: 400 }
      );
    }

    // 1. Compose the prompt using Design Studio data
    const composed = await composePrompt(
      worldId,
      characterIds || [],
      sceneDescription
    );

    console.log("Composed prompt:", composed.text.substring(0, 200) + "...");

    // Determine which model to use (default: cheap FLUX Schnell)
    const selectedModel = model || "replicate";

    // 2. Optionally refine prompt with Anthropic before image generation
    let finalPrompt = composed.text;
    
    if (selectedModel === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      try {
        const Anthropic = await import("@anthropic-ai/sdk");
        const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY! });
        const refined = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          system: "You refine illustration prompts for an AI image generator. Make the prompt more vivid, detailed, and visually specific. Keep it to 2-3 sentences. Output ONLY the refined prompt, nothing else.",
          messages: [{ role: "user", content: `Refine this children's book illustration prompt:\n\n${composed.text}` }],
        });
        const refinedText = refined.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
        if (refinedText.trim()) finalPrompt = refinedText.trim();
      } catch (e) {
        console.warn("Anthropic prompt refinement failed, using original:", e);
      }
    }

    // 3. Generate the illustration with the selected model
    let imageOutput;
    if (selectedModel === "openai") {
      const { generateIllustrationWithOpenAI } = await import("@/lib/ai/illustration");
      imageOutput = await generateIllustrationWithOpenAI({
        prompt: finalPrompt,
        referenceImages: composed.referenceImages,
        worldStylePrompt: composed.worldStylePrompt,
      });
    } else {
      // Default: Replicate — use cheaper FLUX Schnell
      imageOutput = await generateIllustration({
        prompt: finalPrompt,
        referenceImages: composed.referenceImages,
        worldStylePrompt: composed.worldStylePrompt,
        model: "black-forest-labs/flux-schnell",
      });
    }

    // 3. Handle the output
    let imageUrl: string;
    if (Array.isArray(imageOutput)) {
      imageUrl = imageOutput[0] as string;
    } else if (typeof imageOutput === "string") {
      imageUrl = imageOutput;
    } else if (imageOutput && typeof imageOutput === "object" && (imageOutput as any).url) {
      // Handle object with url property
      imageUrl = (imageOutput as any).url;
    } else {
      console.error("Unexpected Replicate output format:", JSON.stringify(imageOutput).substring(0, 200));
      throw new Error(`Unexpected Replicate output format: ${typeof imageOutput}`);
    }
    console.log("Replicate image URL:", imageUrl);

    // 4. Download image and save
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download generated image: ${imageResponse.status}`);
    }
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    console.log("Image downloaded, size:", buffer.length);

    // 5. Save to Vercel Blob ALWAYS (not just when token exists)
    let imagePath = imageUrl; // fallback: use Replicate URL directly

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    console.log("Blob token present:", !!blobToken);
    
    if (blobToken) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(`illustrations/${uuid()}.png`, buffer, {
          access: "public",
          contentType: "image/png",
          token: blobToken,
        });
        imagePath = blob.url;
        console.log("✓ Saved to Vercel Blob:", imagePath);
      } catch (e: any) {
        console.error("Blob save error:", e.message);
        // Fall through to use Replicate URL
      }
    } else {
      console.log("No Blob token — using Replicate URL directly");
    }

    // 6. Save to database
    const db = getDb();
    const record = {
      id: uuid(), storyId, characterIds: characterIds || [], worldId,
      pageNumber: pageNumber || 1, prompt: composed.text, imagePath,
      order: order || pageNumber || 1, status: "generated",
    };

    console.log("Saving illustration record:", { id: record.id, storyId, pageNumber, imagePath: imagePath.substring(0, 50) });

    db.insert(illustrations).values(record).run();
    const created = db.select().from(illustrations).where(eq(illustrations.id, record.id)).get();

    console.log("Illustration saved:", created ? "yes" : "NO - not found in DB");

    // Persist the FULL store to Vercel Blob (so illustrations survive redeploy)
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
        console.log("✓ Illustrations persisted to Vercel Blob");
      }
    } catch (e: any) {
      console.warn("Blob persist failed:", e.message);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Illustration generation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate illustration" },
      { status: 500 }
    );
  }
}
