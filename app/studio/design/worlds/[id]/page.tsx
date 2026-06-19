"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type World = {
  id: string;
  name: string;
  slug: string;
  description: string;
  stylePrompt: string;
  colorPalette: string[];
  referenceImages: string[];
  createdAt: string;
  updatedAt: string;
};

export default function WorldDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === "new";

  const [world, setWorld] = useState<World | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [colorInput, setColorInput] = useState("");
  const [colorPalette, setColorPalette] = useState<string[]>([]);

  useEffect(() => {
    if (isNew) return;
    fetch(`/api/design/worlds/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setWorld(data);
        setName(data.name);
        setDescription(data.description);
        setStylePrompt(data.stylePrompt);
        setColorPalette(data.colorPalette || []);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load world"); setLoading(false); });
  }, [params.id, isNew]);

  const save = useCallback(async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true); setError("");

    const body = { name: name.trim(), description, stylePrompt, colorPalette };
    const url = isNew ? "/api/design/worlds" : `/api/design/worlds/${params.id}`;
    const method = isNew ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      if (isNew) router.push(`/studio/design/worlds/${data.id}`);
      else setWorld(data);
    } else {
      setError(data.error || "Failed to save");
    }
    setSaving(false);
  }, [name, description, stylePrompt, colorPalette, isNew, params.id, router]);

  const deleteWorld = async () => {
    if (!confirm("Delete this world? This cannot be undone.")) return;
    await fetch(`/api/design/worlds/${params.id}`, { method: "DELETE" });
    router.push("/studio/design/worlds");
  };

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto animate-pulse">
        <div className="h-6 w-24 bg-night-surface rounded mb-4" />
        <div className="h-10 w-64 bg-night-surface rounded mb-8" />
        <div className="space-y-4">
          <div className="h-24 bg-night-surface rounded-xl" />
          <div className="h-32 bg-night-surface rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <nav className="flex items-center gap-2 text-sm text-muted mb-6">
        <Link href="/studio/design/worlds" className="hover:text-sky transition-colors">Worlds</Link>
        <span>/</span>
        <span className="text-slate-300">{isNew ? "New World" : name || "..."}</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-100">
          {isNew ? "New World" : `Edit: ${name || world?.name}`}
        </h1>
        <div className="flex gap-3">
          {!isNew && (
            <button onClick={deleteWorld} className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
              Delete
            </button>
          )}
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-sky text-night rounded-lg text-sm font-semibold hover:bg-sky/90 disabled:opacity-50 transition-colors">
            {saving ? "Saving..." : "Save World"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
      )}

      <div className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">World Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="The Nocturnal Meadow"
            className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky/50 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="A luminous nighttime meadow beneath a vast star-flecked sky..."
            className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky/50 transition-colors resize-none"
          />
        </div>

        {/* Style Prompt */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Style Prompt{" "}
            <span className="text-xs text-muted">(injected into every illustration)</span>
          </label>
          <textarea
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            rows={5}
            placeholder="Bright artsy nocturnal storybook illustration. Deep navy night sky with scattered twinkling stars..."
            className="w-full px-4 py-2.5 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky/50 transition-colors resize-none font-mono text-sm"
          />
        </div>

        {/* Color Palette */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Color Palette</label>
          <div className="flex gap-2 mb-2">
            <input
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && colorInput.trim()) {
                  setColorPalette([...colorPalette, colorInput.trim()]);
                  setColorInput("");
                  e.preventDefault();
                }
              }}
              placeholder="#fbbf24"
              className="flex-1 px-4 py-2 bg-night-surface border border-night-border rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky/50 transition-colors text-sm font-mono"
            />
            <button
              onClick={() => {
                if (colorInput.trim()) {
                  setColorPalette([...colorPalette, colorInput.trim()]);
                  setColorInput("");
                }
              }}
              className="px-3 py-2 bg-sky/10 border border-sky/20 text-sky rounded-lg text-sm hover:bg-sky/20 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {colorPalette.map((color, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-md bg-night-surface border border-night-border"
              >
                <span className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                <span className="font-mono text-slate-400">{color}</span>
                <button
                  onClick={() => setColorPalette(colorPalette.filter((_, j) => j !== i))}
                  className="text-muted hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Reference Images placeholder */}
        <div className="glass p-6 text-center">
          <p className="text-sm text-muted mb-2">📷 Reference images upload coming soon</p>
          <p className="text-xs text-slate-600">
            Upload establishing shots of this world for consistent AI illustration generation
          </p>
        </div>

        {world?.createdAt && (
          <p className="text-xs text-muted pt-4 border-t border-night-border">
            Created {new Date(world.createdAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
