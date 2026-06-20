"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Illustration = {
  id: string;
  pageNumber: number;
  imagePath: string;
  prompt: string;
  status: string;
};

type StoryData = {
  id: string;
  title: string;
  ageRange: string;
  theme: string;
  status: string;
  pageCount: number;
  content: string;
  characterIds: string[];
  worldId: string;
  scenes: {
    sceneNumber: number;
    narrative: string;
    illustration: string;
  }[];
  createdAt: string;
};

export default function StoryDetailPage() {
  const params = useParams();
  const [story, setStory] = useState<StoryData | null>(null);
  const [illustrations, setIllustrations] = useState<Record<number, Illustration>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [activeScene, setActiveScene] = useState(0);
  const [imageModel, setImageModel] = useState<string>("replicate");

  // Batch generation state
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ total: 0, done: 0, current: 0 });
  const [batchModel, setBatchModel] = useState<string>("replicate");

  useEffect(() => {
    fetch(`/api/generate/story/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setStory(data);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load story"); setLoading(false); });
  }, [params.id]);

  // Load existing illustrations for this story
  useEffect(() => {
    if (!story) return;
    fetch(`/api/generate/illustration?storyId=${story.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const map: Record<number, Illustration> = {};
          data.forEach((ill: Illustration) => {
            map[ill.pageNumber] = ill;
          });
          setIllustrations(map);
        }
      })
      .catch(() => {});
  }, [story]);

  const generateIllustration = useCallback(async (sceneIndex: number) => {
    if (!story || generating !== null) return;
    setGenerating(sceneIndex);
    setError("");

    const scene = story.scenes[sceneIndex];
    if (!scene) return;

    try {
      const res = await fetch("/api/generate/illustration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          worldId: story.worldId,
          characterIds: story.characterIds || [],
          sceneDescription: scene.illustration,
          pageNumber: scene.sceneNumber,
          order: scene.sceneNumber,
          model: imageModel,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIllustrations((prev) => ({ ...prev, [data.pageNumber]: data }));
      } else {
        setError(data.error || "Failed to generate illustration");
      }
    } catch {
      setError("Network error generating illustration");
    }
    setGenerating(null);
  }, [story, generating]);

  // Batch generate all missing illustrations
  const generateAllIllustrations = useCallback(async () => {
    if (!story || batchGenerating) return;
    const missing = story.scenes
      .map((s, i) => ({ sceneIndex: i, pageNumber: s.sceneNumber }))
      .filter(({ pageNumber }) => !illustrations[pageNumber]);

    if (missing.length === 0) {
      setError("All scenes already have illustrations.");
      return;
    }

    setBatchGenerating(true);
    setError("");
    setBatchProgress({ total: missing.length, done: 0, current: missing[0].pageNumber });

    let completed = 0;
    for (const { sceneIndex, pageNumber } of missing) {
      setBatchProgress({ total: missing.length, done: completed, current: pageNumber });
      const scene = story.scenes[sceneIndex];
      if (!scene) continue;

      try {
        const res = await fetch("/api/generate/illustration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyId: story.id,
            worldId: story.worldId,
            characterIds: story.characterIds || [],
            sceneDescription: scene.illustration,
            pageNumber: scene.sceneNumber,
            order: scene.sceneNumber,
            model: batchModel,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setIllustrations((prev) => ({ ...prev, [data.pageNumber]: data }));
          completed++;
        } else {
          console.warn(`Scene ${pageNumber} failed:`, data.error);
          completed++; // count as done even if failed
        }
      } catch {
        console.warn(`Scene ${pageNumber} network error`);
        completed++;
      }
    }

    setBatchGenerating(false);
    setBatchProgress({ total: 0, done: 0, current: 0 });
  }, [story, illustrations, batchGenerating, batchModel]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto animate-pulse">
        <div className="h-6 w-32 bg-night-surface rounded mb-4" />
        <div className="h-10 w-64 bg-night-surface rounded mb-8" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-96 bg-night-surface rounded-xl" />
          <div className="h-96 bg-night-surface rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !story) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="glass p-12 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            {error || "Story not found"}
          </h3>
          <Link href="/studio/stories" className="text-gold hover:underline text-sm">
            Back to stories
          </Link>
        </div>
      </div>
    );
  }

  if (!story) return null;
  const currentIll = illustrations[activeScene + 1];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <nav className="flex items-center gap-2 text-sm text-muted mb-4">
        <Link href="/studio/stories" className="hover:text-gold transition-colors">Stories</Link>
        <span>/</span>
        <span className="text-slate-300">{story.title}</span>
      </nav>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 mb-1">{story.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>Age {story.ageRange}</span>
            <span>·</span>
            <span>{story.pageCount} scenes</span>
            <span>·</span>
            <span>{story.theme}</span>
            <span>·</span>
            <span>{Object.keys(illustrations).length} illustrated</span>
          </div>
        </div>
        <Link
          href="/studio/videos"
          className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors"
        >
          Create Video
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
      )}

      {/* Batch Generate All Button */}
      {Object.keys(illustrations).length < story.scenes.length && (
        <div className="mb-6 glass p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-slate-200">
                🎨 {Object.keys(illustrations).length} of {story.scenes.length} scenes illustrated
              </p>
              <p className="text-xs text-muted mt-0.5">
                Generate all remaining {story.scenes.length - Object.keys(illustrations).length} at once
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!batchGenerating && (
                <select
                  value={batchModel}
                  onChange={(e) => setBatchModel(e.target.value)}
                  className="px-2 py-1.5 bg-night-surface border border-night-border rounded-lg text-xs text-slate-300 focus:outline-none"
                >
                  <option value="replicate">FLUX Schnell</option>
                  <option value="openai">DALL·E 3</option>
                  <option value="anthropic">Claude refine</option>
                </select>
              )}
              <button
                onClick={generateAllIllustrations}
                disabled={batchGenerating}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-semibold hover:bg-pink-600 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {batchGenerating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Scene {batchProgress.current} · {batchProgress.done}/{batchProgress.total}
                  </>
                ) : (
                  "🎨 Generate All"
                )}
              </button>
            </div>
          </div>
          {batchGenerating && (
            <div className="mt-3">
              <div className="h-1.5 bg-night-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${batchProgress.total > 0 ? (batchProgress.done / batchProgress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-muted mt-1">
                {batchProgress.done} of {batchProgress.total} complete · Each takes ~5 seconds
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scene Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {story.scenes.map((_, i) => {
          const hasIllustration = !!illustrations[i + 1];
          return (
            <button
              key={i}
              onClick={() => setActiveScene(i)}
              className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                i === activeScene
                  ? "bg-gold/20 text-gold border border-gold/30"
                  : "bg-night-surface text-slate-400 border border-night-border hover:border-slate-600"
              }`}
            >
              Scene {i + 1}
              {hasIllustration && <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />}
            </button>
          );
        })}
      </div>

      {/* Scene Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Narrative */}
        <div className="glass p-6">
          <h3 className="text-xs font-semibold text-gold uppercase tracking-wider mb-4">
            Narrative — Scene {activeScene + 1}
          </h3>
          <p className="text-lg leading-relaxed text-slate-200 italic border-l-4 border-gold pl-4">
            {story.scenes[activeScene]?.narrative}
          </p>
          <div className="mt-6 pt-4 border-t border-night-border">
            <p className="text-xs text-muted mb-2">Read aloud:</p>
            <button
              className="px-4 py-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-lg text-sm hover:bg-sky-500/20 transition-colors"
              onClick={() => alert("Narration playback coming in Video Studio phase")}
            >
              🔊 Preview Narration
            </button>
          </div>
        </div>

        {/* Illustration */}
        <div className="glass p-6">
          <h3 className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-4">
            Illustration — Scene {activeScene + 1}
          </h3>

          {/* Model Selector */}
          {!currentIll && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Illustration Model</label>
              <select
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                className="w-full px-3 py-2 bg-night-surface border border-night-border rounded-lg text-xs text-slate-300 focus:outline-none focus:border-pink-500/50 transition-colors"
              >
                <option value="replicate">🎨 Replicate FLUX (best consistency)</option>
                <option value="anthropic">🧠 Anthropic refine + FLUX</option>
                <option value="openai">🖼️ OpenAI DALL·E 3</option>
              </select>
            </div>
          )}

          {currentIll ? (
            <div className="space-y-4">
              <div className="aspect-square rounded-lg overflow-hidden bg-night-surface border border-night-border">
                <img
                  src={currentIll.imagePath}
                  alt={`Scene ${activeScene + 1} illustration`}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-muted">✓ Generated</p>
              <button
                onClick={() => generateIllustration(activeScene)}
                disabled={generating !== null}
                className="w-full py-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-lg text-sm hover:bg-pink-500/20 transition-colors disabled:opacity-50"
              >
                🔄 Regenerate
              </button>
            </div>
          ) : (
            <div>
              <div className="bg-night-surface rounded-lg p-4 font-mono text-sm text-slate-400 leading-relaxed mb-4">
                {story.scenes[activeScene]?.illustration}
              </div>
              <button
                onClick={() => generateIllustration(activeScene)}
                disabled={generating !== null}
                className="w-full py-2.5 bg-pink-500 text-white rounded-lg text-sm font-semibold hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating === activeScene ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  "🎨 Generate Illustration"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Raw content (collapsible) */}
      <details className="mt-8 glass p-4">
        <summary className="text-sm text-muted cursor-pointer hover:text-slate-300 transition-colors">
          View raw AI output
        </summary>
        <pre className="mt-4 text-xs text-slate-500 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
          {story.content}
        </pre>
      </details>
    </div>
  );
}
