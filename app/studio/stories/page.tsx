"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

type Story = {
  id: string;
  title: string;
  ageRange: string;
  status: string;
  pageCount: number;
  characterIds: string[];
  createdAt: string;
};

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/generate/story")
      .then((r) => r.json())
      .then((data) => setStories(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Stories</h1>
          <p className="text-sm text-muted mt-1">Generate and edit Marshmallow Moon stories</p>
        </div>
        <Link
          href="/studio/stories/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg text-sm font-medium hover:bg-violet-500/20 transition-colors"
        >
          + New Story
        </Link>
      </div>

      {stories.length === 0 && (
        <div className="glass p-12 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No stories yet</h3>
          <p className="text-sm text-muted mb-6 max-w-md mx-auto">
            Generate your first Marshmallow Moon story. Stories use characters and worlds
            defined in the Design Studio.
          </p>
          <Link
            href="/studio/stories/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white rounded-lg text-sm font-semibold hover:bg-violet-600 transition-colors"
          >
            Generate First Story
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stories.map((story) => (
          <Link
            key={story.id}
            href={`/studio/stories/${story.id}`}
            className="glass glass-hover p-5 transition-all duration-200"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                story.status === "complete"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                {story.status}
              </span>
              <span className="text-xs text-muted">{story.pageCount} pages</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-200 group-hover:text-gold transition-colors mb-2">
              {story.title}
            </h3>
            <p className="text-xs text-muted">Age {story.ageRange}</p>
            <p className="text-xs text-muted mt-2">Created {formatDate(story.createdAt)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
