"use client";

import { BarChart3, CalendarRange, Users } from "lucide-react";
import { Card } from "@/components/ui";

const reports = [
  { label: "Visitor Reach", value: "Daily + weekly footfall", icon: Users },
  { label: "Peak Hours", value: "Check-in density by time", icon: BarChart3 },
  { label: "Duration Trends", value: "Avg. visit duration", icon: CalendarRange },
];

export default function ReportsPage() {
  return (
    <div>
      <header className="mb-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
          Smart Visitor Management System
        </p>
        <h1 className="text-2xl font-bold text-navy">
          <BarChart3 className="mr-2 inline h-6 w-6 text-accent" strokeWidth={1.8} />
          Reports &amp; Analytics
        </h1>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-canvas-2">
              <Icon className="h-5 w-5 text-accent" strokeWidth={1.8} />
            </span>
            <p className="text-sm font-bold text-ink">{label}</p>
            <p className="mt-1 text-xs text-muted">{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}