import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ============================================================
// Story Generation
// ============================================================

export interface StoryGenerationInput {
  title: string;
  ageRange: string;
  theme: string;
  length: "short" | "medium" | "long";
  characters: {
    name: string;
    species: string;
    personalityBio: string;
    traits: string[];
    catchphrases: string[];
  }[];
  world: {
    name: string;
    description: string;
    stylePrompt: string;
  };
  additionalNotes?: string;
}

const PAGE_COUNT_MAP = { short: 6, medium: 12, long: 20 };

function buildStorySystemPrompt(input: StoryGenerationInput): string {
  const pageCount = PAGE_COUNT_MAP[input.length];
  const characterDescriptions = input.characters
    .map(
      (c) =>
        `### ${c.name} the ${c.species}\n` +
        `Personality: ${c.personalityBio}\n` +
        `Traits: ${c.traits.join(", ")}\n` +
        (c.catchphrases.length > 0 ? `Catchphrases: ${c.catchphrases.map((p) => `"${p}"`).join(", ")}\n` : "")
    )
    .join("\n");

  return `You are a children's book author creating stories in the "Marshmallow Moon" universe.

## World Setting
**${input.world.name}**: ${input.world.description}

## Characters in this story
${characterDescriptions}

## Writing Guidelines
- Target age range: ${input.ageRange} years old
- Theme: ${input.theme}
- Write exactly ${pageCount} pages/scenes
- Each scene should be 2-4 sentences, perfect for reading aloud
- Use warm, gentle language appropriate for the target age
- Include sensory details (sights, sounds, textures)
- Each character should speak/act consistently with their personality
- Include their catchphrases naturally
- End with a gentle, satisfying resolution
- Leave room for illustrations — describe visual moments

## Output Format
Return the story as ${pageCount} scenes. For each scene, provide:
1. A narrative text block (what the reader reads aloud)
2. An illustration description block (what the illustrator should draw)

Format each scene like this:

---

**Scene N**

*Narrative:*  
[The story text for this scene — 2-4 sentences]

*Illustration:*  
[Detailed visual description for the illustrator — include character positions, expressions, lighting, background]

---`;
}

function buildStoryUserPrompt(input: StoryGenerationInput): string {
  const pageCount = PAGE_COUNT_MAP[input.length];
  return `Write a ${pageCount}-page children's story titled "${input.title}" for ages ${input.ageRange}.

Theme: ${input.theme}
${input.additionalNotes ? `\nAdditional notes: ${input.additionalNotes}` : ""}

Make it magical, gentle, and perfect for bedtime reading. Include all characters naturally in the story.`;
}

export async function generateStoryWithAnthropic(input: StoryGenerationInput) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const anthropic = new Anthropic({ apiKey });

  let lastError: any;
  
  // Try multiple model names in order of preference
  const models = [
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
    "claude-opus-4-8",
  ];

  for (const model of models) {
    try {
      console.log(`Trying Anthropic model: ${model}`);
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: buildStorySystemPrompt(input),
        messages: [{ role: "user", content: buildStoryUserPrompt(input) }],
      });

      const content = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      console.log(`✓ Story generated with model: ${model}`);
      return content;
    } catch (e: any) {
      console.warn(`Model ${model} failed:`, e.status || e.message);
      lastError = e;
      // If it's a 401 (unauthorized), don't retry
      if (e.status === 401) break;
    }
  }

  throw new Error(
    `All Anthropic models failed. Last error: ${lastError?.status || ""} ${lastError?.message || lastError}`
  );
}

export async function generateStoryWithOpenAI(input: StoryGenerationInput) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4000,
    messages: [
      { role: "system", content: buildStorySystemPrompt(input) },
      { role: "user", content: buildStoryUserPrompt(input) },
    ],
  });

  return response.choices[0]?.message?.content || "";
}

export async function generateStory(input: StoryGenerationInput) {
  // Try Anthropic first, fall back to OpenAI
  if (process.env.ANTHROPIC_API_KEY) {
    return generateStoryWithAnthropic(input);
  }
  if (process.env.OPENAI_API_KEY) {
    return generateStoryWithOpenAI(input);
  }
  throw new Error("No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
}

// ============================================================
// Story Parsing
// ============================================================

export interface StoryScene {
  sceneNumber: number;
  narrative: string;
  illustration: string;
}

export function parseStoryScenes(rawText: string): StoryScene[] {
  const scenes: StoryScene[] = [];
  const sceneRegex = /\*\*Scene (\d+)\*\*\s*\n\s*\*Narrative:\*\s*\n([\s\S]*?)\n\s*\*Illustration:\*\s*\n([\s\S]*?)(?=\n---|\n\*\*Scene|\n*$)/g;

  let match;
  while ((match = sceneRegex.exec(rawText)) !== null) {
    scenes.push({
      sceneNumber: parseInt(match[1]),
      narrative: match[2].trim(),
      illustration: match[3].trim(),
    });
  }

  // If regex parsing failed, try simpler fallback (AI format)
  if (scenes.length === 0) {
    const fallbackRegex = /\*\*Scene (\d+)\*\*([\s\S]*?)(?=\*\*Scene \d+\*\*|$)/g;
    while ((match = fallbackRegex.exec(rawText)) !== null) {
      const content = match[2].trim();
      const narrativeMatch = content.match(/\*Narrative:\*\s*\n([\s\S]*?)(?=\*Illustration:|$)/);
      const illustrationMatch = content.match(/\*Illustration:\*\s*\n([\s\S]*?)$/);
      scenes.push({
        sceneNumber: parseInt(match[1]),
        narrative: narrativeMatch?.[1]?.trim() || "",
        illustration: illustrationMatch?.[1]?.trim() || "",
      });
    }
  }

  // Fallback for uploaded stories: ## Scene N, Scene N:, or --- separators
  if (scenes.length === 0) {
    // Try ## Scene N or Scene N: markers (case insensitive)
    const uploadedRegex = /(?:##\s*)?Scene\s+(\d+):?\s*\n([\s\S]*?)(?=(?:(?:##\s*)?Scene\s+\d+:?\s*\n|$))/gi;
    while ((match = uploadedRegex.exec(rawText)) !== null) {
      scenes.push({
        sceneNumber: parseInt(match[1]),
        narrative: match[2].trim(),
        illustration: match[2].trim(), // Same text used for illustration prompt
      });
    }

    // Try --- separators
    if (scenes.length === 0) {
      const parts = rawText.split(/\n---\n/);
      parts.forEach((part, i) => {
        const trimmed = part.trim();
        if (trimmed) {
          scenes.push({
            sceneNumber: i + 1,
            narrative: trimmed,
            illustration: trimmed,
          });
        }
      });
    }

    // Last resort: split by double newlines into paragraphs
    if (scenes.length === 0) {
      const paragraphs = rawText.split(/\n\n+/).filter((p) => p.trim().length > 20);
      paragraphs.forEach((p, i) => {
        scenes.push({
          sceneNumber: i + 1,
          narrative: p.trim(),
          illustration: p.trim(),
        });
      });
    }
  }

  return scenes;
}
