"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

type Character = {
  id: string;
  name: string;
  slug: string;
  species: string;
  personalityBio: string;
  appearancePrompt: string;
  traits: string[];
  catchphrases: string[];
  referenceImages: string[];
  createdAt: string;
};

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/design/characters")
      .then((r) => r.json())
      .then((data) => {
        setCharacters(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-night-surface rounded" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-night-surface rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Characters</h1>
          <p className="text-sm text-muted mt-1">
            The source of truth for every character in the Marshmallow Moon universe
          </p>
        </div>
        <Link
          href="/studio/design/characters/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 text-gold rounded-lg text-sm font-medium hover:bg-gold/20 transition-colors"
        >
          + New Character
        </Link>
      </div>

      {/* Empty state */}
      {characters.length === 0 && (
        <div className="glass p-12 text-center">
          <div className="text-5xl mb-4">🎭</div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No characters yet</h3>
          <p className="text-sm text-muted mb-6 max-w-md mx-auto">
            Create your first character to begin building the Marshmallow Moon universe.
            Characters defined here are used across all studios.
          </p>
          <Link
            href="/studio/design/characters/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-night rounded-lg text-sm font-semibold hover:bg-gold/90 transition-colors"
          >
            Create First Character
          </Link>
        </div>
      )}

      {/* Character Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((char) => (
          <Link
            key={char.id}
            href={`/studio/design/characters/${char.id}`}
            className="group glass glass-hover p-5 transition-all duration-200"
          >
            {/* Species badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {char.species}
              </span>
              <span className="text-xs text-muted">
                {char.referenceImages.length} refs
              </span>
            </div>

            <h3 className="text-lg font-semibold text-slate-200 group-hover:text-gold transition-colors mb-2">
              {char.name}
            </h3>

            <p className="text-sm text-muted line-clamp-3 mb-3">
              {char.personalityBio}
            </p>

            {/* Traits */}
            <div className="flex flex-wrap gap-1.5">
              {char.traits.slice(0, 3).map((trait) => (
                <span
                  key={trait}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-night-surface text-slate-400"
                >
                  {trait}
                </span>
              ))}
              {char.traits.length > 3 && (
                <span className="text-[11px] text-muted">
                  +{char.traits.length - 3}
                </span>
              )}
            </div>

            <p className="text-xs text-muted mt-3">
              Created {formatDate(char.createdAt)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
