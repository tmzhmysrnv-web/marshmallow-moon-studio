"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clx } from "@/lib/utils";

const navigation = [
  {
    section: "Design Studio",
    items: [
      { label: "Characters", href: "/studio/design/characters", icon: Users },
      { label: "Worlds", href: "/studio/design/worlds", icon: Globe },
    ],
  },
  {
    section: "Production",
    items: [
      { label: "Stories", href: "/studio/stories", icon: BookOpen },
      { label: "Illustrations", href: "/studio/illustrations", icon: Palette },
      { label: "Videos", href: "/studio/videos", icon: Film },
    ],
  },
  {
    section: "Publishing",
    items: [
      { label: "Social", href: "/studio/social", icon: Share2 },
      { label: "Print", href: "/studio/print", icon: BookMarked },
    ],
  },
];

function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function Globe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function BookOpen(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function Palette(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="13.5" cy="6.5" r={1.5} fill="currentColor" />
      <circle cx="17.5" cy="10.5" r={1.5} fill="currentColor" />
      <circle cx="8.5" cy="7.5" r={1.5} fill="currentColor" />
      <circle cx="6.5" cy="12.5" r={1.5} fill="currentColor" />
      <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10a2 2 0 0 0 2-2c0-.52-.2-1-.53-1.37-.33-.36-.47-.82-.47-1.28 0-1.1.9-2 2-2h2.35c3.13 0 5.65-2.52 5.65-5.65C22.53 5.93 17.9 2 12 2z" />
    </svg>
  );
}

function Film(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
    </svg>
  );
}

function Share2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

function BookMarked(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20l-6-3-6 3V2z" />
      <path d="M6.5 2A2.5 2.5 0 0 0 4 4.5v15" />
    </svg>
  );
}

function Moon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-night border-r border-night-border flex flex-col z-50">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 px-6 py-5 border-b border-night-border">
        <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Moon className="w-5 h-5 text-gold" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-gold tracking-tight">
            Marshmallow
          </span>
          <span className="text-xs text-muted">Moon Studio</span>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navigation.map((section) => (
          <div key={section.section}>
            <h3 className="px-3 mb-2 text-xs font-semibold text-muted uppercase tracking-wider">
              {section.section}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clx(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        isActive
                          ? "bg-gold/10 text-gold border border-gold/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-night-surface"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-night-border">
        <p className="text-xs text-muted">
          Marshmallow Moon Studio v0.1
        </p>
      </div>
    </aside>
  );
}
