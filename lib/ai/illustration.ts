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

  // Build the full prompt with world style injected, sanitize Unicode
  const fullPrompt = [
    input.worldStylePrompt,
    input.prompt,
    "Children's book illustration. Soft edges, warm and magical atmosphere. Consistent character design.",
  ]
    .filter(Boolean)
    .join(" ")
    // Replace Unicode characters that cause Replicate API errors
    .replace(/[\u2018\u2019\u201C\u201D\u2013\u2014\u2026\u00A0\u2022\u00B7]/g, (c: string) => {
      const map: Record<string, string> = {
        '\u2018': "'", '\u2019': "'",  // smart single quotes
        '\u201C': '"', '\u201D': '"',  // smart double quotes
        '\u2013': '-', '\u2014': '--', // en/em dashes
        '\u2026': '...',                // ellipsis
        '\u00A0': ' ',                  // non-breaking space
        '\u2022': '-',                  // bullet
        '\u00B7': '-',                  // middle dot
      };
      return map[c] || c;
    })
    // Remove any remaining non-ASCII characters that aren't standard
    .replace(/[^\x00-\x7F]/g, '');

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
