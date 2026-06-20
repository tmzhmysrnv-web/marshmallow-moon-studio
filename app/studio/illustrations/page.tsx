"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Illustration = {
  id: string;
  storyId: string;
  pageNumber: number;
  imagePath: string;
  prompt: string;
  status: string;
  createdAt: string;
};

type Story = {
  id: string;
  title: string;
};

export default function IllustrationsPage() {
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Illustration | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/generate/illustration").then((r) => r.json()),
      fetch("/api/generate/story").then((r) => r.json()).catch(() => []),
    ])
      .then(([ills, storyData]) => {
        setIllustrations(Array.isArray(ills) ? ills : []);
        // Try to load stories from the illustrations' story data as fallback
        if (Array.isArray(ills) && (!Array.isArray(storyData) || storyData.length === 0)) {
          const storyIds = [...new Set(ills.map((i: any) => i.storyId))];
          setStories(storyIds.map((sid: string) => ({ id: sid, title: "Loading..." })));
        } else {
          setStories(Array.isArray(storyData) ? storyData : []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStoryTitle = (storyId: string) => {
    const story = stories.find((s) => s.id === storyId);
    if (story && story.title && story.title !== "Loading...") return story.title;
    return storyId ? "Story " + storyId.substring(0, 8) : "Story";
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-night-surface rounded mb-6" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square bg-night-surface rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Illustrations</h1>
          <p className="text-sm text-muted mt-1">
            {illustrations.length} illustration{illustrations.length !== 1 ? "s" : ""} generated
          </p>
        </div>
        <Link
          href="/studio/stories"
          className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-lg text-sm font-medium hover:bg-pink-500/20 transition-colors"
        >
          Browse Stories
        </Link>
      </div>

      {illustrations.length === 0 ? (
        <div className="glass p-12 text-center">
          <div className="text-5xl mb-4">🎨</div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No illustrations yet</h3>
          <p className="text-sm text-muted mb-6 max-w-md mx-auto">
            Generate illustrations from your stories. Each illustration uses character
            references and world style presets from the Design Studio for consistency.
          </p>
          <Link
            href="/studio/stories"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-lg text-sm font-semibold hover:bg-pink-600 transition-colors"
          >
            Browse Stories to Illustrate
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {illustrations.map((ill) => (
            <button
              key={ill.id}
              onClick={() => setSelectedImage(ill)}
              className="group glass glass-hover overflow-hidden transition-all duration-200 text-left"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={ill.imagePath}
                  alt={`Page ${ill.pageNumber}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-slate-300 truncate">
                  {getStoryTitle(ill.storyId)}
                </p>
                <p className="text-xs text-muted">Page {ill.pageNumber}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-slate-400 hover:text-white transition-colors text-sm"
            >
              ✕ Close
            </button>
            <img
              src={selectedImage.imagePath}
              alt={`Page ${selectedImage.pageNumber}`}
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl"
            />
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-300">{getStoryTitle(selectedImage.storyId)}</p>
              <p className="text-xs text-muted">Page {selectedImage.pageNumber}</p>
              <details className="mt-3">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                  View prompt
                </summary>
                <pre className="mt-2 text-xs text-slate-400 whitespace-pre-wrap font-mono text-left max-w-lg mx-auto bg-night-surface rounded-lg p-3">
                  {selectedImage.prompt}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
