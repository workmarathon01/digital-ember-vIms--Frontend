"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Car,
  ClipboardList,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  User as UserIcon,
} from "lucide-react";
import { Button, Card, Field, Select, TextInput } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { createVisitor, fetchVisitors } from "@/lib/api";
import type { Visitor } from "@/lib/types";

const initialForm = {
  name: "",
  contact_no: "",
  purpose: "",
  coming_from: "",
  visit_type: "One Time",
  expected_date: "",
  expected_time: "",
  vehicle_number: "",
  expected_duration: "30",
};

type FormState = typeof initialForm;

function formatExpectedTime(raw: string | null): string {
  if (!raw) return "";
  return new Date(raw).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VisitorsPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function load() {
    try {
      const res = await fetchVisitors();
      setVisitors(res.visitors);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const visitor = await createVisitor({ ...form });
      setNotice(
        `Visitor pass ${visitor.pass_code ?? "issued"} successfully. Share the pass code with the visitor.`,
      );
      setForm(initialForm);
      await load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create visitor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <header className="mb-8">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
          Smart Visitor Management System
        </p>
        <h1 className="text-2xl font-bold text-navy">
          <ClipboardList className="mr-2 inline h-6 w-6 text-accent" strokeWidth={1.8} />
          Visitor Pre-Registration
        </h1>
      </header>

      {notice ? (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-success/30 bg-success-bg px-4 py-3 text-sm font-medium text-success">
          <BadgeCheck className="h-4 w-4" />
          {notice}
        </div>
      ) : null}

      <Card className="p-6">
        <h2 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-ink">
          New Visitor Pass
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Full Name" required>
            <TextInput
              required
              placeholder="e.g. Rohan Mehta"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>
          <Field label="Contact Number" required>
            <TextInput
              required
              placeholder="e.g. 98765 43210"
              value={form.contact_no}
              onChange={(e) => update("contact_no", e.target.value)}
            />
          </Field>
          <Field label="Purpose of Visit" required>
            <Select
              required
              value={form.purpose}
              onChange={(e) => update("purpose", e.target.value)}
            >
              <option value="">Select purpose</option>
              <option>Meeting</option>
              <option>Interview</option>
              <option>Delivery</option>
              <option>Maintenance</option>
              <option>Office Work</option>
              <option>Other</option>
            </Select>
          </Field>
          <Field label="Visit Type">
            <Select
              value={form.visit_type}
              onChange={(e) => update("visit_type", e.target.value)}
            >
              <option>One Time</option>
              <option>Recurring</option>
              <option>Vendor</option>
            </Select>
          </Field>
          <Field label="Coming From">
            <TextInput
              placeholder="City / Company"
              value={form.coming_from}
              onChange={(e) => update("coming_from", e.target.value)}
            />
          </Field>
          <Field label="Expected Duration">
            <Select
              value={form.expected_duration}
              onChange={(e) => update("expected_duration", e.target.value)}
            >
              <option value="30">30 min</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="180">3+ hours</option>
            </Select>
          </Field>
          <Field label="Expected Date">
            <TextInput
              type="date"
              value={form.expected_date}
              onChange={(e) => update("expected_date", e.target.value)}
            />
          </Field>
          <Field label="Expected Time">
            <TextInput
              type="time"
              value={form.expected_time}
              onChange={(e) => update("expected_time", e.target.value)}
            />
          </Field>
          <Field label="Vehicle Number" hint="Optional — logged for vehicle passes.">
            <TextInput
              placeholder="e.g. MH 01 AB 1234"
              value={form.vehicle_number}
              onChange={(e) => update("vehicle_number", e.target.value)}
            />
          </Field>

          {error ? (
            <p className="rounded-lg border border-warn/30 bg-warn-bg px-3 py-2 text-[13px] font-medium text-warn md:col-span-2">
              {error}
            </p>
          ) : null}

          <div className="md:col-span-2">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Issue Visitor Pass
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <div className="border-b border-line">
          <h2 className="px-5 py-4 text-sm font-bold uppercase tracking-[0.08em] text-ink">
            Recently Issued Passes
          </h2>
        </div>
        <div className="overflow-x-auto">
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-muted" />
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">
                    No passes issued yet.
                  </td>
                </tr>
              ) : (
                visitors.map((v) => (
                  <tr key={v.id} className="border-b border-line-soft text-[13px] hover:bg-canvas">
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-info-bg text-info">
                          <UserIcon className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="font-medium text-ink">{v.name}</p>
                          <p className="flex items-center gap-1 text-xs text-muted">
                            <Phone className="h-3 w-3" /> {v.contact_no ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px] text-accent-strong">
                      {v.pass_code ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-muted">{v.purpose ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-muted" />
                        {v.expected_date ?? "—"}
                        {v.expected_time ? ` ${formatExpectedTime(v.expected_time)}` : ""}
                      </span>
                      {v.coming_from ? (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                          <MapPin className="h-3 w-3" /> {v.coming_from}
                        </span>
                      ) : null}
                      {v.vehicle_number ? (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                          <Car className="h-3 w-3" /> {v.vehicle_number}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      {v.checked_in ? (
                        <StatusBadge tone="success">Checked-in</StatusBadge>
                      ) : (
                        <StatusBadge tone="info">Expected</StatusBadge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}