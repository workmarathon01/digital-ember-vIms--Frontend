"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { Button, Card, Field, Select, TextInput } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { createStaff, fetchStaffs } from "@/lib/api";
import type { Staff } from "@/lib/types";

const initialForm = {
  firstname: "",
  lastname: "",
  email: "",
  mobile_no: "",
  work_type: "Contractor",
  status_type: "Pending",
  valid_from: "",
  valid_till: "",
  joining_date: "",
};

type FormState = typeof initialForm;

export default function StaffsPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function load() {
    try {
      const res = await fetchStaffs();
      setStaffs(res.data);
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
      const staff = await createStaff({ ...form });
      setNotice(`Staff member ${staff.staff_id ?? staff.full_name} created successfully.`);
      setForm(initialForm);
      await load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create staff member.");
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
          <Briefcase className="mr-2 inline h-6 w-6 text-accent" strokeWidth={1.8} />
          Staff Directory
        </h1>
      </header>

      {notice ? (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-success/30 bg-success-bg px-4 py-3 text-sm font-medium text-success">
          <BadgeCheck className="h-4 w-4" />
          {notice}
        </div>
      ) : null}

      <Card className="p-6">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.08em] text-ink">
          New Staff Member
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="First Name" required>
            <TextInput
              required
              placeholder="e.g. Meera"
              value={form.firstname}
              onChange={(e) => update("firstname", e.target.value)}
            />
          </Field>
          <Field label="Last Name" required>
            <TextInput
              required
              placeholder="e.g. Sharma"
              value={form.lastname}
              onChange={(e) => update("lastname", e.target.value)}
            />
          </Field>
          <Field label="Work Email" required>
            <TextInput
              type="email"
              required
              placeholder="meera@company.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>
          <Field label="Mobile Number" required>
            <TextInput
              required
              placeholder="e.g. 98765 43210"
              value={form.mobile_no}
              onChange={(e) => update("mobile_no", e.target.value)}
            />
          </Field>
          <Field label="Work Type">
            <Select value={form.work_type} onChange={(e) => update("work_type", e.target.value)}>
              <option>Contractor</option>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Vendor</option>
              <option>Intern</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={form.status_type}
              onChange={(e) => update("status_type", e.target.value)}
            >
              <option>Pending</option>
              <option>Approved</option>
            </Select>
          </Field>
          <Field label="Joining Date">
            <TextInput
              type="date"
              value={form.joining_date}
              onChange={(e) => update("joining_date", e.target.value)}
            />
          </Field>
          <Field label="Valid Till" hint="Leave blank for permanent access.">
            <TextInput
              type="date"
              value={form.valid_till}
              onChange={(e) => update("valid_till", e.target.value)}
            />
          </Field>

          {error ? (
            <p className="rounded-lg border border-warn/30 bg-warn-bg px-3 py-2 text-[13px] font-medium text-warn md:col-span-2">
              {error}
            </p>
          ) : null}

          <div className="md:col-span-2">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
              Create Staff Member
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <div className="border-b border-line">
          <h2 className="px-5 py-4 text-sm font-bold uppercase tracking-[0.08em] text-ink">
            Staff Directory
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5">Name</th>
                <th className="px-5 py-2.5">Staff ID</th>
                <th className="px-5 py-2.5">Work Type</th>
                <th className="px-5 py-2.5">Contact</th>
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
              ) : staffs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">
                    No staff members yet.
                  </td>
                </tr>
              ) : (
                staffs.map((s) => (
                  <tr key={s.id} className="border-b border-line-soft text-[13px] hover:bg-canvas">
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-info-bg text-info">
                          <UserRound className="h-3.5 w-3.5" />
                        </span>
                        <p className="font-medium text-ink">{s.full_name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px] text-accent-strong">
                      {s.staff_id ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-muted">{s.work_type ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">
                      <p className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {s.email ?? "—"}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs">
                        <Phone className="h-3 w-3" /> {s.mobile_no ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      {s.status_type === "Approved" ? (
                        <StatusBadge tone="success">Approved</StatusBadge>
                      ) : s.status_type === "Suspended" ? (
                        <StatusBadge tone="warning">Suspended</StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">Pending</StatusBadge>
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