"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Character = { id: string; name: string; species: string };
type World = { id: string; name: string; description: string };

export default function NewStoryPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [ageRange, setAgeRange] = useState("4-8");
  const [length, setLength] = useState<"short" | "medium" | "long">("short");
  const [theme, setTheme] = useState("friendship and wonder");
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [selectedWorld, setSelectedWorld] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/design/characters").then((r) => r.json()),
      fetch("/api/design/worlds").then((r) => r.json()),
    ])
      .then(([chars, worldsData]) => {
        setCharacters(chars);
        setWorlds(worldsData);
        if (worldsData.length > 0) setSelectedWorld(worldsData[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleCharacter = (id: string) => {
    setSelectedCharacters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const generate = useCallback(async () => {
    if (!title.trim()) { setError("Please enter a story title"); return; }
    if (!selectedWorld) { setError("Please select a world"); return; }
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/generate/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          ageRange,
          length,
          theme: theme.trim(),
          characterIds: selectedCharacters,
          worldId: selectedWorld,
          additionalNotes: additionalNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/studio/stories/${data.id}`);
      } else {
        setError(data.error || "Failed to generate story");
      }
    } catch {
      setError("Network error. Check your API keys and try again.");
    }
    setGenerating(false);
  }, [title, ageRange, length, theme, selectedCharacters, selectedWorld, additionalNotes, router]);

  if (loading) {
    return (
      <div className="p-8 max-w-2xl mx-auto animate-pulse">
        <div className="h-6 w-32 bg-night-surface rounded mb-4" />
        <div className="h-10 w-64 bg-night-surface rounded mb-8" />
        <div className="space-y-4">
          <div className="h-20 bg-night-surface rounded-xl" />
          <div className="h-20 bg-night-surface rounded-xl" />
          <div className="h-20 bg-night-surface rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <nav className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/studio/stories" className="hover:text-gold transition-colors">Stories</Link>
        <span>/</span>
        <span className="text-slate-300">New Story</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-100 mb-2">Generate a Story</h1>
      <p className="text-sm text-muted mb-8">
        AI will write a Marshmallow Moon story using characters and worlds from your Design Studio
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
      )}

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Story Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Milo and the Marshmallow Moon"
            className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        {/* Age Range + Length */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Age Range</label>
            <select
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors"
            >
              <option value="2-4">Ages 2-4 (Toddler)</option>
              <option value="4-8">Ages 4-8 (Early Reader)</option>
              <option value="6-10">Ages 6-10 (Middle Grade)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Story Length</label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value as any)}
              className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors"
            >
              <option value="short">Short (6 pages)</option>
              <option value="medium">Medium (12 pages)</option>
              <option value="long">Long (20 pages)</option>
            </select>
          </div>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Theme</label>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="friendship and wonder"
            className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        {/* World */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">World</label>
          {worlds.length === 0 ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
              No worlds defined.{" "}
              <Link href="/studio/design/worlds/new" className="underline">Create one first</Link>
            </div>
          ) : (
            <select
              value={selectedWorld}
              onChange={(e) => setSelectedWorld(e.target.value)}
              className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors"
            >
              {worlds.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Characters */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Characters</label>
          {characters.length === 0 ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-400">
              No characters defined.{" "}
              <Link href="/studio/design/characters/new" className="underline">Create one first</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {characters.map((char) => (
                <label
                  key={char.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCharacters.includes(char.id)
                      ? "border-violet-500/30 bg-violet-500/10"
                      : "border-night-border bg-night-surface hover:border-violet-500/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCharacters.includes(char.id)}
                    onChange={() => toggleCharacter(char.id)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedCharacters.includes(char.id)
                      ? "border-violet-400 bg-violet-500"
                      : "border-slate-600"
                  }`}>
                    {selectedCharacters.includes(char.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-200">{char.name}</span>
                    <span className="text-xs text-muted ml-2">{char.species}</span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Additional Notes (optional)</label>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            rows={2}
            placeholder="Include a sleepy moon, a starry river crossing..."
            className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={generate}
          disabled={generating}
          className="w-full py-3 bg-violet-500 text-white rounded-lg font-semibold hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating story...
            </>
          ) : (
            "✨ Generate Story"
          )}
        </button>
      </div>
    </div>
  );
}
