import { getDb } from "./index";
import { characters, worlds } from "./schema";
import { v4 as uuid } from "uuid";

type Relationship = { characterId: string; description: string };

export async function seed() {
  const db = getDb();

  // Check if already seeded
  const existing = db.select().from(characters).all();
  if (existing.length > 0) return;

  // ============================================================
  // Characters
  // ============================================================
  const milo = {
    id: uuid(),
    name: "Milo",
    slug: "milo",
    species: "Mouse",
    personalityBio:
      "Milo is an adventurous, wide-eyed young mouse with boundless curiosity. " +
      "He sees wonder in the ordinary and believes anything is possible if you climb high enough. " +
      "He carries a sturdy canvas backpack with tiny brass buckles — always prepared for an expedition. " +
      "Milo is brave but never reckless; he leads with his heart.",
    appearancePrompt:
      "A small adventurous mouse with wide expressive eyes full of wonder. " +
      "Warm brown fur, slightly lighter on the belly. " +
      "Sturdy canvas backpack with tiny brass buckles. " +
      "Small rounded ears, delicate whiskers, tiny paws. " +
      "Expression: eager, hopeful, looking upward. " +
      "Children's book illustration style, soft edges, warm lighting.",
    voiceId: null,
    traits: ["adventurous", "curious", "brave", "kind-hearted", "hopeful"],
    catchphrases: ["Let's go see!", "Just a little higher..."],
    relationships: [] as Relationship[],
    referenceImages: [],
  };

  const clover = {
    id: uuid(),
    name: "Clover",
    slug: "clover",
    species: "Caterpillar",
    personalityBio:
      "Clover is a sleepy, curious green caterpillar who never goes anywhere " +
      "without her oversized chunky-knit ivory scarf — even in summer. She moves slowly " +
      "but thinks deeply, often noticing details others rush past. Clover is the gentle " +
      "philosopher of the group, offering quiet wisdom between yawns.",
    appearancePrompt:
      "A sleepy green caterpillar with a gentle, curious expression. " +
      "Soft sage-green segmented body with tiny legs. " +
      "Oversized chunky-knit ivory scarf wrapped several times around her neck. " +
      "Half-closed drowsy eyes that still sparkle with curiosity. " +
      "Children's book illustration style, soft edges, cozy feeling.",
    voiceId: null,
    traits: ["sleepy", "wise", "gentle", "observant", "cozy"],
    catchphrases: ["Take your time...", "I was just thinking..."],
    relationships: [] as Relationship[],
    referenceImages: [],
  };

  const pip = {
    id: uuid(),
    name: "Pip",
    slug: "pip",
    species: "Firefly",
    personalityBio:
      "Pip is a shy, flickering firefly whose glow pulses brighter or dimmer " +
      "depending on his emotions. When nervous, he flickers; when happy, he shines " +
      "steady and warm. He has iridescent wings that catch the moonlight. Pip is " +
      "the quiet heart of the group — he doesn't say much, but his light says everything.",
    appearancePrompt:
      "A shy, small firefly with iridescent translucent wings that shimmer " +
      "in blues, purples, and golds. His body glows with a warm golden bioluminescent " +
      "pulse that flickers when he's nervous and shines steady when he's happy. " +
      "Tiny antennae, delicate legs. Expression: bashful but warm. " +
      "Children's book illustration style, soft glowing edges, magical atmosphere.",
    voiceId: null,
    traits: ["shy", "gentle", "emotive", "luminous", "loyal"],
    catchphrases: ["*flickers softly*", "...hi."],
    relationships: [] as Relationship[],
    referenceImages: [],
  };

  // Update relationships after all characters are created
  milo.relationships = [
    { characterId: clover.id, description: "Best friend and climbing companion" },
    { characterId: pip.id, description: "Quiet friend whose light guides the way" },
  ];
  clover.relationships = [
    { characterId: milo.id, description: "Brave friend who leads the adventures" },
    { characterId: pip.id, description: "Gentle friend who lights up the night" },
  ];
  pip.relationships = [
    { characterId: milo.id, description: "Adventurous friend who makes him feel brave" },
    { characterId: clover.id, description: "Cozy friend who never rushes him" },
  ];

  db.insert(characters).values([milo, clover, pip]).run();

  // ============================================================
  // Worlds
  // ============================================================
  const nocturnalMeadow = {
    id: uuid(),
    name: "The Nocturnal Meadow",
    slug: "nocturnal-meadow",
    description:
      "A luminous nighttime meadow beneath a vast star-flecked sky. " +
      "Rolling hills of soft grass that glow faintly in the moonlight. " +
      "The marshmallow moon hangs impossibly large and close, casting silver light " +
      "across the landscape. Fireflies dance in the tall grass. " +
      "The air is warm and still, carrying the scent of night-blooming flowers. " +
      "A place where small creatures have big adventures.",
    stylePrompt:
      "Bright artsy nocturnal storybook illustration. " +
      "Deep navy night sky with scattered twinkling stars. " +
      "Warm golden bioluminescent glow from fireflies and magical light sources. " +
      "Silver moonlight rim-lighting on characters and landscape. " +
      "Soft glowing edges throughout, not photorealistic. " +
      "Cinematic composition with depth and atmosphere. " +
      "Color palette: deep purples (#1a1a2e), warm golds (#fbbf24), cool silvers (#bae6fd). " +
      "Cozy tactile details. Playful but atmospheric. " +
      "The marshmallow moon should appear soft, luminous, textured like a real marshmallow " +
      "but impossibly large in the sky.",
    colorPalette: ["#1a1a2e", "#16213e", "#fbbf24", "#f59e0b", "#bae6fd", "#7dd3fc", "#e0e7ff", "#c7d2fe"],
    referenceImages: [],
  };

  db.insert(worlds).values(nocturnalMeadow).run();

  console.log("✓ Seed complete: Milo, Clover, Pip + The Nocturnal Meadow");
}
