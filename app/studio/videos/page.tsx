"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Story = { id: string; title: string; status: string; pageCount: number };
type Video = { id: string; storyId: string; videoPath: string; clipCount?: number; hasNarration?: boolean; status: string; createdAt: string };

export default function VideosPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [assembling, setAssembling] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/generate/story").then((r) => r.json()),
      fetch("/api/generate/video").then((r) => r.json()),
    ])
      .then(([s, v]) => {
        setStories(Array.isArray(s) ? s : []);
        setVideos(Array.isArray(v) ? v : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const assembleVideo = async (storyId: string) => {
    setAssembling(storyId);
    setError("");
    try {
      const res = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId }),
      });
      const data = await res.json();
      if (res.ok) {
        setVideos((prev) => [...prev, data]);
      } else {
        setError(data.error || "Assembly failed");
      }
    } catch {
      setError("Network error");
    }
    setAssembling(null);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-night-surface rounded mb-6" />
        <div className="space-y-4">{[1, 2, 3].map((i) => (<div key={i} className="h-24 bg-night-surface rounded-xl" />))}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Videos</h1>
          <p className="text-sm text-muted mt-1">
            Assemble narrated slideshow videos with Ken Burns effects
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
      )}

      {/* Completed Videos */}
      {videos.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Completed Videos ({videos.length})
          </h2>
          <div className="space-y-3">
            {videos.map((v) => {
              const story = stories.find((s) => s.id === v.storyId);
              return (
                <div key={v.id} className="glass p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {story?.title || "Unknown Story"}
                    </p>
                    <p className="text-xs text-muted">
                      {v.hasNarration ? "🎙️ Narrated" : "🎬 Silent"} · {v.clipCount} clips · {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {v.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Stories Available for Video */}
      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Stories Ready for Video
        </h2>
        {stories.length === 0 ? (
          <div className="glass p-12 text-center">
            <div className="text-5xl mb-4">🎬</div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No stories yet</h3>
            <p className="text-sm text-muted mb-6">Generate a story and illustrations first.</p>
            <Link href="/studio/stories/new" className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
              Create Story
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => {
              const existing = videos.find((v) => v.storyId === story.id);
              return (
                <div key={story.id} className="glass p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{story.title}</p>
                    <p className="text-xs text-muted">{story.pageCount} pages · {story.status}</p>
                  </div>
                  {existing ? (
                    <span className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-full">
                      ✓ Assembled
                    </span>
                  ) : (
                    <button
                      onClick={() => assembleVideo(story.id)}
                      disabled={assembling === story.id}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      {assembling === story.id ? "Assembling..." : "🎬 Assemble Video"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
