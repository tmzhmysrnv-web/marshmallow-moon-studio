import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ============================================================
// Social Content Generation
// ============================================================

export interface SocialInput {
  type: "carousel" | "reel" | "story";
  storyTitle: string;
  storyExcerpt: string;
  characterNames: string[];
  tone: "whimsical" | "cozy" | "adventurous" | "magical";
}

function buildSocialSystemPrompt(input: SocialInput): string {
  return `You are a social media manager for a children's book series called "Marshmallow Moon."
You create Instagram content that is warm, magical, and appeals to parents of young children (ages ${input.tone === "adventurous" ? "4-8" : "2-6"}).

## Characters in this story
${input.characterNames.join(", ")}

## Content Guidelines
- Keep captions warm, inclusive, and family-friendly
- Use emojis sparingly and thoughtfully
- Hashtags should be discoverable but not spammy
- Include a call-to-action that encourages engagement
- Tone: ${input.tone}

Return your response as JSON with these fields:
- caption: The Instagram caption (include line breaks with \\n)
- hashtags: Array of 10-15 relevant hashtags
- hook: A short, engaging first line for the caption
- cta: Call to action`;
}

export async function generateSocialContent(input: SocialInput) {
  const userPrompt = `Create a ${input.type} post for Instagram.

Story: "${input.storyTitle}"
Excerpt: "${input.storyExcerpt}"

Return JSON.`;

  // Try Anthropic first
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: buildSocialSystemPrompt(input),
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    try {
      return JSON.parse(text);
    } catch {
      return { caption: text, hashtags: [], hook: "", cta: "" };
    }
  }

  // Fall back to OpenAI
  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      messages: [
        { role: "system", content: buildSocialSystemPrompt(input) },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  }

  throw new Error("No AI provider configured");
}
