"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

type World = {
  id: string;
  name: string;
  slug: string;
  description: string;
  stylePrompt: string;
  colorPalette: string[];
  referenceImages: string[];
  createdAt: string;
};

export default function WorldsPage() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/design/worlds")
      .then((r) => r.json())
      .then((data) => {
        setWorlds(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-night-surface rounded" />
          <div className="grid sm:grid-cols-2 gap-4">
            {[1].map((i) => (
              <div key={i} className="h-48 bg-night-surface rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Worlds</h1>
          <p className="text-sm text-muted mt-1">
            Define style presets and settings for every location in the universe
          </p>
        </div>
        <Link
          href="/studio/design/worlds/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky/10 border border-sky/20 text-sky rounded-lg text-sm font-medium hover:bg-sky/20 transition-colors"
        >
          + New World
        </Link>
      </div>

      {worlds.length === 0 && (
        <div className="glass p-12 text-center">
          <div className="text-5xl mb-4">🌙</div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No worlds yet</h3>
          <p className="text-sm text-muted mb-6 max-w-md mx-auto">
            Create your first world to define the visual style of the Marshmallow Moon universe.
          </p>
          <Link
            href="/studio/design/worlds/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky text-night rounded-lg text-sm font-semibold hover:bg-sky/90 transition-colors"
          >
            Create First World
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {worlds.map((world) => (
          <Link
            key={world.id}
            href={`/studio/design/worlds/${world.id}`}
            className="group glass glass-hover p-5 transition-all duration-200"
          >
            <h3 className="text-lg font-semibold text-slate-200 group-hover:text-sky transition-colors mb-2">
              🌙 {world.name}
            </h3>
            <p className="text-sm text-muted line-clamp-2 mb-4">
              {world.description}
            </p>
            {/* Color palette swatches */}
            {world.colorPalette.length > 0 && (
              <div className="flex gap-1.5 mb-3">
                {world.colorPalette.slice(0, 6).map((color, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full border border-white/10"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                {world.colorPalette.length > 6 && (
                  <span className="text-xs text-muted self-center">
                    +{world.colorPalette.length - 6}
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-muted">
              Created {formatDate(world.createdAt)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
