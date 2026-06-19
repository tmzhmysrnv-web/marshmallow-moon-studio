"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Story = { id: string; title: string };
type SocialPost = { id: string; type: string; caption: string; hashtags: string[]; sourceStoryId: string; status: string; createdAt: string };

export default function SocialPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/generate/story").then((r) => r.json()),
      fetch("/api/generate/social").then((r) => r.json()),
    ])
      .then(([s, p]) => {
        setStories(Array.isArray(s) ? s : []);
        setPosts(Array.isArray(p) ? p : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const generatePost = async (storyId: string, type: string) => {
    setGenerating(`${storyId}-${type}`);
    setError("");
    try {
      const res = await fetch("/api/generate/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId, type }),
      });
      const data = await res.json();
      if (res.ok) setPosts((prev) => [...prev, data]);
      else setError(data.error || "Generation failed");
    } catch {
      setError("Network error");
    }
    setGenerating(null);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-night-surface rounded mb-6" />
        <div className="space-y-4">{[1, 2, 3].map((i) => (<div key={i} className="h-32 bg-night-surface rounded-xl" />))}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Social</h1>
          <p className="text-sm text-muted mt-1">Generate Instagram-ready content</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
      )}

      {/* Generated Posts */}
      {posts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Generated Posts ({posts.length})
          </h2>
          <div className="space-y-4">
            {posts.map((post) => {
              const story = stories.find((s) => s.id === post.sourceStoryId);
              return (
                <div key={post.id} className="glass p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      post.type === "carousel" ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" :
                      post.type === "reel" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                      "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    }`}>
                      {post.type}
                    </span>
                    <span className="text-xs text-muted">{story?.title || "Unknown"}</span>
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap mb-3">{post.caption}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {post.hashtags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400">{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Generate from Stories */}
      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Generate from Stories
        </h2>
        {stories.length === 0 ? (
          <div className="glass p-12 text-center">
            <div className="text-5xl mb-4">📱</div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No stories yet</h3>
            <Link href="/studio/stories/new" className="px-5 py-2.5 bg-cyan-500 text-white rounded-lg text-sm font-semibold hover:bg-cyan-600 transition-colors">
              Create Story First
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => (
              <div key={story.id} className="glass p-4">
                <p className="text-sm font-medium text-slate-200 mb-3">{story.title}</p>
                <div className="flex gap-2">
                  {(["carousel", "reel", "story"] as const).map((type) => {
                    const key = `${story.id}-${type}`;
                    const isGenerating = generating === key;
                    return (
                      <button
                        key={type}
                        onClick={() => generatePost(story.id, type)}
                        disabled={generating !== null}
                        className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-xs font-medium hover:bg-cyan-500/20 disabled:opacity-50 transition-colors"
                      >
                        {isGenerating ? "..." : `+ ${type}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
