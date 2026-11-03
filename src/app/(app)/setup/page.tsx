"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { setupModules } from "@/lib/setup-modules";

export default function SetupOverviewPage() {
  const { user } = useAuth();
  const visibleModules = setupModules.filter((module) =>
    can(user, module.permission.resource, module.permission.action),
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visibleModules.map(({ href, label, description, icon: Icon }) => (
        <Link key={href} href={href} className="group block">
          <Card className="flex h-full flex-col p-5 transition hover:border-accent/40 hover:shadow-sm">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-canvas-2">
              <Icon className="h-5 w-5 text-accent" strokeWidth={1.8} />
            </span>
            <h2 className="text-sm font-bold text-ink">{label}</h2>
            <p className="mt-1 flex-1 text-xs leading-5 text-muted">
              {description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent-strong">
              Open module
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Card>
        </Link>
      ))}

      <Card className="flex h-full min-h-40 flex-col items-start justify-center border-dashed p-5">
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-canvas-2">
          <Plus className="h-5 w-5 text-muted" strokeWidth={1.8} />
        </span>
        <h2 className="text-sm font-bold text-ink">More modules soon</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          New setup modules will appear here as they are added.
        </p>
      </Card>
    </div>
  );
}
