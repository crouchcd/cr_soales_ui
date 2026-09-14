"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Paper Upload", icon: "upload_file" },
  { href: "/admin/papers", label: "Papers", icon: "dataset" },
  { href: "/admin/queue", label: "Queue", icon: "queue" },
  { href: "/admin/gold-scoring", label: "Gold Scoring", icon: "fact_check" },
];

const isActivePath = (pathname: string, href: string) => {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function AdminRail({ statusSlot }: { statusSlot: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="soales-rail soales-rail-pinned group">
      <div className="mb-4 mt-2 flex min-w-[10.75rem] items-center gap-3 px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f2937]">
          <span className="material-symbols-outlined text-[#93c5fd]">
            admin_panel_settings
          </span>
        </div>
        <div className="soales-rail-label flex flex-col whitespace-nowrap">
          <span className="soales-subheading text-[18px] leading-tight text-[#e5e7eb]">
            Admin Panel
          </span>
          <span className="soales-mono text-[10px] text-[#ccc3d8]">Admin</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`soales-rail-link ${
                active ? "soales-rail-link-active" : ""
              }`}
            >
              <span
                className="material-symbols-outlined shrink-0"
                style={
                  active ? { fontVariationSettings: "'FILL' 1" } : undefined
                }
              >
                {item.icon}
              </span>
              <span className="soales-rail-label soales-mono">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        {statusSlot}
        <form action="/api/auth/logout" method="post" className="mx-2">
          <button
            type="submit"
            className="soales-rail-link w-[10.75rem] border-0 bg-transparent text-left"
          >
            <span className="material-symbols-outlined shrink-0">logout</span>
            <span className="soales-rail-label soales-mono">Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
