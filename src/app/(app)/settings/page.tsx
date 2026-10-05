"use client";

import { ShieldCheck, Settings as SettingsIcon } from "lucide-react";
import { Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div>
      <header className="mb-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
          Smart Visitor Management System
        </p>
        <h1 className="text-2xl font-bold text-navy">
          <SettingsIcon className="mr-2 inline h-6 w-6 text-accent" strokeWidth={1.8} />
          Settings
        </h1>
      </header>

      <Card className="max-w-lg p-6">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-ink">
          Signed-in profile
        </h2>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-white">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{user?.full_name ?? "Guest"}</p>
            <p className="text-xs text-muted">{user?.email ?? "—"}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}