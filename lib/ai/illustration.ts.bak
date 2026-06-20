import Replicate from "replicate";

// ============================================================
// Illustration Generation
// ============================================================

export interface IllustrationInput {
  prompt: string; // The composed prompt
  referenceImages?: string[]; // URLs of reference images for character consistency
  worldStylePrompt?: string;
  width?: number;
  height?: number;
}

export async function generateIllustration(input: IllustrationInput) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN not configured");
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  // Build the full prompt — aggressively strip ALL non-ASCII characters
  const fullPrompt = [
    input.worldStylePrompt || "",
    input.prompt || "",
    "Childrens book illustration. Soft edges, warm and magical atmosphere. Consistent character design.",
  ]
    .filter(Boolean)
    .join(" ")
    // Remove ALL non-ASCII characters (anything above 127)
    .replace(/[^\x00-\x7F]/g, "")
    // Clean up multiple spaces and double punctuation
    .replace(/\s+/g, " ")
    .replace(/\'\'+/g, "'")
    .trim();

  const inputData: Record<string, any> = {
    prompt: fullPrompt,
    width: input.width || 1024,
    height: input.height || 1024,
    num_outputs: 1,
    aspect_ratio: "1:1",
    output_format: "png",
    output_quality: 90,
  };

  // Add reference images if available (FLUX.2 Max supports this)
  if (input.referenceImages && input.referenceImages.length > 0) {
    inputData.image = input.referenceImages.slice(0, 8); // FLUX supports up to 8 refs
  }

  // Use FLUX.2 Max for best character consistency
  const output = await replicate.run("black-forest-labs/flux-2-max" as any, {
    input: inputData,
  });

  return output;
}

// ============================================================
// Replicate alternative: GPT Image (OpenAI)
// ============================================================

export async function generateIllustrationWithOpenAI(input: IllustrationInput) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const { OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const fullPrompt = [
    input.worldStylePrompt,
    input.prompt,
    "Children's book illustration. Soft edges, warm and magical atmosphere.",
  ]
    .filter(Boolean)
    .join(" ");

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: fullPrompt,
    n: 1,
    size: "1024x1024",
    quality: "hd",
    style: "vivid",
  });

  return response.data?.[0]?.url;
}
