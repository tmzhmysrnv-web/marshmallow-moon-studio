// ============================================================
// Illustration Generation — direct Replicate REST API
// ============================================================

export interface IllustrationInput {
  prompt: string;
  referenceImages?: string[];
  worldStylePrompt?: string;
  width?: number;
  height?: number;
  model?: string;
}

async function callReplicateAPI(version: string, input: Record<string, unknown>) {
  const token = process.env.REPLICATE_API_TOKEN!;

  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version, input }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate API ${res.status}: ${text.substring(0, 300)}`);
  }

  const prediction = await res.json() as any;

  let result = prediction;
  for (let i = 0; i < 60; i++) {
    if (result.status === "succeeded") return result.output;
    if (result.status === "failed" || result.status === "canceled") {
      throw new Error(`Replicate ${result.status}: ${JSON.stringify(result.error || "unknown")}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Token ${token}` } }
    );
    result = await poll.json();
  }

  throw new Error("Replicate prediction timed out after 120s");
}

export async function generateIllustration(input: IllustrationInput) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN not configured");
  }

  const fullPrompt = [
    input.worldStylePrompt || "",
    input.prompt || "",
  ]
    .filter(Boolean)
    .join(". ")
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  console.log("Sanitized prompt (" + fullPrompt.length + " chars):", fullPrompt.substring(0, 100));

  const inputData: Record<string, unknown> = {
    prompt: fullPrompt,
    width: (input.width || 1024),
    height: (input.height || 1024),
    num_outputs: 1,
    aspect_ratio: "1:1",
    output_format: "png",
    output_quality: 90,
  };

  if (input.referenceImages && input.referenceImages.length > 0) {
    inputData.image = input.referenceImages.slice(0, 8);
  }

  return callReplicateAPI(input.model || "black-forest-labs/flux-schnell", inputData);
}

export async function generateIllustrationWithOpenAI(input: IllustrationInput) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const fullPrompt = [
    input.worldStylePrompt || "",
    input.prompt || "",
  ]
    .filter(Boolean)
    .join(". ")
    .replace(/[^\x00-\x7F]/g, "")
    .trim();

  const OpenAI = await import("openai");
  const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });

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
