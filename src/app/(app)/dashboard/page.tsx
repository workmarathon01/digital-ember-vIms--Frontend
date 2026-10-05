"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Clock3,
  LogIn,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { fetchDashboard, fetchVisitors } from "@/lib/api";
import type { DashboardMetrics, Visitor, VisitorStatus } from "@/lib/types";

interface Metric {
  label: string;
  value: number;
  icon: typeof Users;
}

function visitorStatus(v: Visitor): { label: VisitorStatus; tone: "success" | "info" | "warning" } {
  if (v.checked_in) return { label: "Checked-in", tone: "success" };
  if (v.visitor_in_out === "OUT") return { label: "Checked-out", tone: "warning" };
  return { label: "Expected", tone: "info" };
}

function formatExpected(v: Visitor): string {
  const date = v.expected_date
    ? new Date(`${v.expected_date}T00:00:00`).toLocaleDateString()
    : "—";
  if (!v.expected_time) return date;
  const time = new Date(v.expected_time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [dash, list] = await Promise.all([fetchDashboard(), fetchVisitors()]);
      setMetrics(dash);
      setVisitors(list.visitors);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const metricCards: Metric[] = metrics
    ? [
        { label: "Total Users", value: metrics.users_count, icon: Users },
        { label: "Active Visitors", value: metrics.visitors_count, icon: UserCheck },
        { label: "Checked-in Now", value: metrics.checked_in_visitors_count, icon: LogIn },
        { label: "Staff Members", value: metrics.staffs_count, icon: Building2 },
        { label: "Pending Approvals", value: metrics.pending_staffs_count, icon: Clock3 },
      ]
    : [];

  return (
    <div>
      <header className="mb-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
          Smart Visitor Management System
        </p>
        <h1 className="text-2xl font-bold text-navy">
          <span className="font-bold text-navy">Smart Access.</span>{" "}
          <span className="font-bold text-primary">Secure Visitors.</span>
        </h1>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading dashboard…
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {metricCards.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas-2">
                  <Icon className="h-5 w-5 text-accent" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-tight text-ink">
                    {value.toLocaleString()}
                  </p>
                  <p className="text-xs font-medium text-muted">{label}</p>
                </div>
              </Card>
            ))}
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between px-5 pt-4">
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-ink">
                  Recent Visitors
                </h2>
                <Link
                  href="/visitors"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Pre-register <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th className="px-5 py-2.5">Visitor</th>
                      <th className="px-5 py-2.5">Pass Code</th>
                      <th className="px-5 py-2.5">Purpose</th>
                      <th className="px-5 py-2.5">Expected</th>
                      <th className="px-5 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">
                          No visitors yet. Use pre-registration to issue a pass.
                        </td>
                      </tr>
                    ) : (
                      visitors.map((v) => {
                        const { label, tone } = visitorStatus(v);
                        return (
                          <tr
                            key={v.id}
                            className="border-b border-line-soft text-[13px] transition hover:bg-canvas"
                          >
                            <td className="py-3.5 pl-5 pr-4">
                              <p className="font-medium text-ink">{v.name}</p>
                              <p className="text-xs text-muted">{v.contact_no ?? "—"}</p>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-[12px] text-accent-strong">
                              {v.pass_code ?? "—"}
                            </td>
                            <td className="px-5 py-3.5 text-muted">{v.purpose ?? "—"}</td>
                            <td className="px-5 py-3.5 text-muted">
                              {formatExpected(v)}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge tone={tone}>{label}</StatusBadge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="flex flex-col overflow-hidden">
              <div className="border-b border-line lab:block hidden bg-canvas px-5 py-3.5">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
                  <ClipboardList className="h-3.5 w-3.5 text-accent" />
                  Kiosk / Tablet Check-in
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="rounded-lg bg-gradient-to-br from-primary to-primary-light p-6 text-center">
                  <h3 className="mb-4 text-base font-bold text-white">
                    Self-service visitor sign-in
                  </h3>
                  <Link
                    href="/kiosk"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-primary transition hover:bg-white/90"
                  >
                    Check-in Here
                    <span aria-hidden className="text-base font-bold">
                      →
                    </span>
                  </Link>
                </div>
                <ul className="space-y-2 text-[13px] text-muted">
                  <li>• QR-based verification</li>
                  <li>• Real-time host notification</li>
                  <li>• Auto badge printing</li>
                </ul>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}