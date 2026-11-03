"use client";

import { LayoutGrid, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { setupModules } from "@/lib/setup-modules";

export default function SetupLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const visibleModules = setupModules.filter((module) =>
    can(user, module.permission.resource, module.permission.action),
  );
  const tabs = [
    { href: "/setup", label: "Overview", icon: LayoutGrid },
    ...visibleModules.map(({ href, label, icon }) => ({ href, label, icon })),
  ];

  return (
    <div>
      <header className="mb-6">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
          Smart Visitor Management System
        </p>
        <h1 className="text-2xl font-bold text-navy">
          <Settings2 className="mr-2 inline h-6 w-6 text-accent" strokeWidth={1.8} />
          Setup
        </h1>
        <p className="mt-1 text-sm text-muted">
          Configure the shared lists and modules that power the rest of the app.
        </p>
      </header>

      <nav className="mb-6 flex flex-wrap gap-1 rounded-lg border border-line bg-card p-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/setup"
              ? pathname === "/setup"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold transition ${
                active
                  ? "bg-navy text-white"
                  : "text-muted hover:bg-canvas-2 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
