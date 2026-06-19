import Link from "next/link";

const studios = [
  {
    label: "Characters",
    href: "/studio/design/characters",
    description: "Manage character bios, appearances, and reference images",
    icon: "🎭",
    accent: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/20",
  },
  {
    label: "Worlds",
    href: "/studio/design/worlds",
    description: "Define style presets and world settings",
    icon: "🌙",
    accent: "from-sky-500/20 to-sky-500/5",
    border: "border-sky-500/20",
  },
  {
    label: "Stories",
    href: "/studio/stories",
    description: "Generate and edit Marshmallow Moon stories",
    icon: "📝",
    accent: "from-violet-500/20 to-violet-500/5",
    border: "border-violet-500/20",
  },
  {
    label: "Illustrations",
    href: "/studio/illustrations",
    description: "Create consistent character illustrations",
    icon: "🎨",
    accent: "from-pink-500/20 to-pink-500/5",
    border: "border-pink-500/20",
  },
  {
    label: "Videos",
    href: "/studio/videos",
    description: "Assemble narrated slideshow videos",
    icon: "🎬",
    accent: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20",
  },
  {
    label: "Social",
    href: "/studio/social",
    description: "Generate Instagram-ready content",
    icon: "📱",
    accent: "from-cyan-500/20 to-cyan-500/5",
    border: "border-cyan-500/20",
  },
  {
    label: "Print",
    href: "/studio/print",
    description: "Export print-ready paperback PDFs",
    icon: "📕",
    accent: "from-rose-500/20 to-rose-500/5",
    border: "border-rose-500/20",
  },
];

export default function Dashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          <span className="text-gold-gradient">Marshmallow Moon</span>
          <span className="text-slate-500 font-normal"> Studio</span>
        </h1>
        <p className="text-lg text-muted max-w-2xl">
          Your AI-powered children&apos;s book production factory. Create stories,
          illustrations, videos, social content, and print-ready books — all from
          one place.
        </p>
      </header>

      {/* Quick Start — Design Studio first */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Design Studio — The Source of Truth
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {studios.slice(0, 2).map((studio) => (
            <Link
              key={studio.href}
              href={studio.href}
              className={`group glass glass-hover p-6 transition-all duration-300 bg-gradient-to-br ${studio.accent} ${studio.border}`}
            >
              <span className="text-3xl mb-3 block">{studio.icon}</span>
              <h3 className="text-lg font-semibold mb-1 text-slate-200 group-hover:text-gold transition-colors">
                {studio.label}
              </h3>
              <p className="text-sm text-muted">{studio.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Production Studios */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Production
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {studios.slice(2, 5).map((studio) => (
            <Link
              key={studio.href}
              href={studio.href}
              className={`group glass glass-hover p-6 transition-all duration-300 bg-gradient-to-br ${studio.accent} ${studio.border}`}
            >
              <span className="text-3xl mb-3 block">{studio.icon}</span>
              <h3 className="text-lg font-semibold mb-1 text-slate-200 group-hover:text-gold transition-colors">
                {studio.label}
              </h3>
              <p className="text-sm text-muted">{studio.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Publishing */}
      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
          Publishing
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {studios.slice(5).map((studio) => (
            <Link
              key={studio.href}
              href={studio.href}
              className={`group glass glass-hover p-6 transition-all duration-300 bg-gradient-to-br ${studio.accent} ${studio.border}`}
            >
              <span className="text-3xl mb-3 block">{studio.icon}</span>
              <h3 className="text-lg font-semibold mb-1 text-slate-200 group-hover:text-gold transition-colors">
                {studio.label}
              </h3>
              <p className="text-sm text-muted">{studio.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer note */}
      <footer className="mt-16 pt-8 border-t border-night-border">
        <p className="text-xs text-muted text-center">
          Marshmallow Moon Studio · Built with Next.js, Tailwind, and AI
        </p>
      </footer>
    </div>
  );
}
