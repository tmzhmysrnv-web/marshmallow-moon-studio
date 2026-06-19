import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { illustrations } from "@/lib/db/schema";
import { composePrompt } from "@/lib/ai/prompt-composer";
import { generateIllustration } from "@/lib/ai/illustration";
import { v4 as uuid } from "uuid";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import path from "path";

// GET /api/generate/illustration — list all illustrations, optionally filtered by story
export async function GET(req: NextRequest) {
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

    console.log("🎨 Composed prompt:", composed.text.substring(0, 200) + "...");

    // 2. Optionally refine prompt with Anthropic before image generation
    let finalPrompt = composed.text;
    const selectedModel = model || "replicate";
    
    if (selectedModel === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      try {
        const Anthropic = await import("@anthropic-ai/sdk");
        const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY! });
        const refined = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
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
      // Default: Replicate FLUX
      imageOutput = await generateIllustration({
        prompt: finalPrompt,
        referenceImages: composed.referenceImages,
        worldStylePrompt: composed.worldStylePrompt,
      });
    }

    // 3. Handle the output (Replicate returns URL or array of URLs)
    let imageUrl: string;
    if (Array.isArray(imageOutput)) {
      imageUrl = imageOutput[0] as string;
    } else if (typeof imageOutput === "string") {
      imageUrl = imageOutput;
    } else {
      throw new Error("Unexpected Replicate output format");
    }

    // 4. Download and save the image locally
    const dataDir = path.resolve("data", "illustrations");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filename = `${uuid()}.png`;
    const filePath = path.join(dataDir, filename);

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download generated image: ${imageResponse.status}`);
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // 5. Save to database
    const db = getDb();
    const illustration = {
      id: uuid(),
      storyId,
      characterIds: characterIds || [],
      worldId,
      pageNumber: pageNumber || 1,
      prompt: composed.text,
      imagePath: `/data/illustrations/${filename}`,
      order: order || pageNumber || 1,
      status: "generated",
    };

    db.insert(illustrations).values(illustration).run();

    const created = db
      .select()
      .from(illustrations)
      .where(eq(illustrations.id, illustration.id))
      .get();

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Illustration generation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate illustration" },
      { status: 500 }
    );
  }
}
