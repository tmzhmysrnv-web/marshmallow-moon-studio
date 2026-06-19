"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Story = { id: string; title: string; pageCount: number };
type PrintExport = { id: string; storyId: string; pdfPath: string; settings: { trimWidth: number; trimHeight: number; bleedMm: number; pageCount: number; includeCover: boolean }; status: string; createdAt: string };

export default function PrintPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [exports, setExports] = useState<PrintExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/generate/story").then((r) => r.json()),
      fetch("/api/export/print").then((r) => r.json()),
    ])
      .then(([s, e]) => {
        setStories(Array.isArray(s) ? s : []);
        setExports(Array.isArray(e) ? e : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const exportPrint = async (storyId: string) => {
    setExporting(storyId);
    setError("");
    try {
      const res = await fetch("/api/export/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId, trimWidth: 8.5, trimHeight: 8.5, bleedMm: 3, includeCover: true }),
      });
      const data = await res.json();
      if (res.ok) setExports((prev) => [...prev, data]);
      else setError(data.error || "Export failed");
    } catch {
      setError("Network error");
    }
    setExporting(null);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-night-surface rounded mb-6" />
        <div className="space-y-4">{[1, 2, 3].map((i) => (<div key={i} className="h-16 bg-night-surface rounded-xl" />))}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Print</h1>
          <p className="text-sm text-muted mt-1">Export print-ready paperback PDFs</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
      )}

      {/* Completed Exports */}
      {exports.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Exported ({exports.length})
          </h2>
          <div className="space-y-3">
            {exports.map((exp) => {
              const story = stories.find((s) => s.id === exp.storyId);
              return (
                <div key={exp.id} className="glass p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{story?.title || "Unknown"}</p>
                    <p className="text-xs text-muted">
                      {exp.settings.trimWidth}"×{exp.settings.trimHeight}" · {exp.settings.pageCount}pp · {exp.settings.bleedMm}mm bleed · {exp.settings.includeCover ? "+cover" : "no cover"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      {exp.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Stories Available */}
      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Stories Ready for Export
        </h2>
        {stories.length === 0 ? (
          <div className="glass p-12 text-center">
            <div className="text-5xl mb-4">📕</div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No stories yet</h3>
            <Link href="/studio/stories/new" className="px-5 py-2.5 bg-rose-500 text-white rounded-lg text-sm font-semibold hover:bg-rose-600 transition-colors">
              Create Story First
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => {
              const existing = exports.find((e) => e.storyId === story.id);
              return (
                <div key={story.id} className="glass p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{story.title}</p>
                    <p className="text-xs text-muted">{story.pageCount} pages</p>
                  </div>
                  {existing ? (
                    <span className="px-3 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-full">✓ Exported</span>
                  ) : (
                    <button
                      onClick={() => exportPrint(story.id)}
                      disabled={exporting === story.id}
                      className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 disabled:opacity-50 transition-colors"
                    >
                      {exporting === story.id ? "Exporting..." : "📕 Export PDF"}
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
