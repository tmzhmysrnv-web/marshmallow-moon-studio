// ElevenLabs has deprecated the old SDK. Use direct fetch API.

const BASE_URL = "https://api.elevenlabs.io/v1";

export interface NarrationInput {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export async function generateNarration(input: NarrationInput) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const voiceId = input.voiceId || "JBFqnCBsd6RMkjVDRZzb"; // Default voice
  const modelId = input.modelId || "eleven_multilingual_v2";

  const response = await fetch(
    `${BASE_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: input.text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${error}`);
  }

  // Returns audio buffer
  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}

export async function getVoices() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const response = await fetch(`${BASE_URL}/voices`, {
    headers: { "xi-api-key": apiKey },
  });

  if (!response.ok) throw new Error("Failed to fetch voices");
  const data = await response.json();
  return data.voices;
}
