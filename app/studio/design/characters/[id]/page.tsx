"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Character = {
  id: string;
  name: string;
  slug: string;
  species: string;
  personalityBio: string;
  appearancePrompt: string;
  voiceId: string | null;
  traits: string[];
  catchphrases: string[];
  relationships: { characterId: string; description: string }[];
  referenceImages: string[];
  createdAt: string;
  updatedAt: string;
};

export default function CharacterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === "new";

  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [personalityBio, setPersonalityBio] = useState("");
  const [appearancePrompt, setAppearancePrompt] = useState("");
  const [traitInput, setTraitInput] = useState("");
  const [traits, setTraits] = useState<string[]>([]);
  const [catchphraseInput, setCatchphraseInput] = useState("");
  const [catchphrases, setCatchphrases] = useState<string[]>([]);
  const [voiceId, setVoiceId] = useState("");

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/design/characters/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setCharacter(data);
        setName(data.name);
        setSpecies(data.species);
        setPersonalityBio(data.personalityBio);
        setAppearancePrompt(data.appearancePrompt);
        setTraits(data.traits || []);
        setCatchphrases(data.catchphrases || []);
        setVoiceId(data.voiceId || "");
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load character");
        setLoading(false);
      });
  }, [params.id, isNew]);

  const save = useCallback(async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");

    const body = {
      name: name.trim(),
      species: species.trim(),
      personalityBio,
      appearancePrompt,
      traits,
      catchphrases,
      voiceId: voiceId || null,
    };

    const url = isNew ? "/api/design/characters" : `/api/design/characters/${params.id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok) {
      if (isNew) router.push(`/studio/design/characters/${data.id}`);
      else setCharacter(data);
    } else {
      setError(data.error || "Failed to save");
    }
    setSaving(false);
  }, [name, species, personalityBio, appearancePrompt, traits, catchphrases, voiceId, isNew, params.id, router]);

  const deleteCharacter = async () => {
    if (!confirm("Delete this character? This cannot be undone.")) return;
    await fetch(`/api/design/characters/${params.id}`, { method: "DELETE" });
    router.push("/studio/design/characters");
  };

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto animate-pulse">
        <div className="h-6 w-32 bg-night-surface rounded mb-4" />
        <div className="h-10 w-64 bg-night-surface rounded mb-8" />
        <div className="space-y-4">
          <div className="h-24 bg-night-surface rounded-xl" />
          <div className="h-24 bg-night-surface rounded-xl" />
          <div className="h-24 bg-night-surface rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/studio/design/characters" className="hover:text-gold transition-colors">
          Characters
        </Link>
        <span>/</span>
        <span className="text-slate-300">{isNew ? "New Character" : name || "..."}</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-100">
          {isNew ? "New Character" : `Edit: ${name || character?.name}`}
        </h1>
        <div className="flex gap-3">
          {!isNew && (
            <button
              onClick={deleteCharacter}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 bg-gold text-night rounded-lg text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Character"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Name + Species */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Milo"
              className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Species</label>
            <input
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="Mouse"
              className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>
        </div>

        {/* Personality Bio */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Personality Bio</label>
          <textarea
            value={personalityBio}
            onChange={(e) => setPersonalityBio(e.target.value)}
            rows={4}
            placeholder="Describe their personality, quirks, and role in the story..."
            className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-gold/50 transition-colors resize-none"
          />
        </div>

        {/* Appearance Prompt */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Appearance Prompt{" "}
            <span className="text-xs text-muted">(injected into illustration generation)</span>
          </label>
          <textarea
            value={appearancePrompt}
            onChange={(e) => setAppearancePrompt(e.target.value)}
            rows={3}
            placeholder="A small adventurous mouse with wide expressive eyes..."
            className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-gold/50 transition-colors resize-none font-mono text-sm"
          />
        </div>

        {/* Traits */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Traits</label>
          <div className="flex gap-2 mb-2">
            <input
              value={traitInput}
              onChange={(e) => setTraitInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && traitInput.trim()) {
                  setTraits([...traits, traitInput.trim()]);
                  setTraitInput("");
                  e.preventDefault();
                }
              }}
              placeholder="Add a trait..."
              className="flex-1 px-4 py-2 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-gold/50 transition-colors text-sm"
            />
            <button
              onClick={() => {
                if (traitInput.trim()) {
                  setTraits([...traits, traitInput.trim()]);
                  setTraitInput("");
                }
              }}
              className="px-3 py-2 bg-gold/10 border border-gold/20 text-gold rounded-lg text-sm hover:bg-gold/20 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {traits.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                {t}
                <button
                  onClick={() => setTraits(traits.filter((_, j) => j !== i))}
                  className="hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Catchphrases */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Catchphrases</label>
          <div className="flex gap-2 mb-2">
            <input
              value={catchphraseInput}
              onChange={(e) => setCatchphraseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && catchphraseInput.trim()) {
                  setCatchphrases([...catchphrases, catchphraseInput.trim()]);
                  setCatchphraseInput("");
                  e.preventDefault();
                }
              }}
              placeholder='e.g., "Let&apos;s go see!"'
              className="flex-1 px-4 py-2 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-gold/50 transition-colors text-sm"
            />
            <button
              onClick={() => {
                if (catchphraseInput.trim()) {
                  setCatchphrases([...catchphrases, catchphraseInput.trim()]);
                  setCatchphraseInput("");
                }
              }}
              className="px-3 py-2 bg-gold/10 border border-gold/20 text-gold rounded-lg text-sm hover:bg-gold/20 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {catchphrases.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 italic"
              >
                &ldquo;{c}&rdquo;
                <button
                  onClick={() => setCatchphrases(catchphrases.filter((_, j) => j !== i))}
                  className="hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* ElevenLabs Voice ID */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            ElevenLabs Voice ID{" "}
            <span className="text-xs text-muted">(for narration)</span>
          </label>
          <input
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            placeholder="JBFqnCBsd6RMkjVDRZzb"
            className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-gold/50 transition-colors font-mono text-sm"
          />
        </div>

        {/* Reference Images placeholder */}
        <div className="glass p-6 text-center">
          <p className="text-sm text-muted mb-2">
            📷 Reference images upload coming soon
          </p>
          <p className="text-xs text-slate-600">
            You&apos;ll be able to upload 2-3 reference poses per character for consistent AI illustration generation
          </p>
        </div>

        {character?.createdAt && (
          <p className="text-xs text-muted pt-4 border-t border-night-border">
            Created {new Date(character.createdAt).toLocaleString()}
            {character.updatedAt !== character.createdAt &&
              ` · Updated ${new Date(character.updatedAt).toLocaleString()}`}
          </p>
        )}
      </div>
    </div>
  );
}
