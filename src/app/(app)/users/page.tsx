"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserCog,
  UserRound,
} from "lucide-react";
import { Button, Card, Field, Select, TextInput } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { createUser, fetchRoles, fetchUsers } from "@/lib/api";
import type { Role, User } from "@/lib/types";

const initialForm = {
  email: "",
  firstname: "",
  lastname: "",
  mobile: "",
  password: "",
  user_type: "Admin",
  role_id: "",
};

type FormState = typeof initialForm;

export default function UsersPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function load() {
    try {
      const [userRes, roleRes] = await Promise.all([fetchUsers(), fetchRoles()]);
      setUsers(userRes.data);
      setRoles(roleRes.data);
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
      const user = await createUser({
        ...form,
        role_id: form.role_id ? Number(form.role_id) : undefined,
        active: true,
      });
      setNotice(`User account ${user.email} created successfully.`);
      setForm(initialForm);
      await load();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user account.");
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
          <UserCog className="mr-2 inline h-6 w-6 text-accent" strokeWidth={1.8} />
          User Management
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
          Create User Account
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="First Name" required>
            <TextInput
              required
              placeholder="e.g. Aditi"
              value={form.firstname}
              onChange={(e) => update("firstname", e.target.value)}
            />
          </Field>
          <Field label="Last Name" required>
            <TextInput
              required
              placeholder="e.g. Rao"
              value={form.lastname}
              onChange={(e) => update("lastname", e.target.value)}
            />
          </Field>
          <Field label="Email Address" required>
            <TextInput
              type="email"
              required
              placeholder="aditi@company.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>
          <Field label="Mobile Number">
            <TextInput
              placeholder="e.g. 98765 43210"
              value={form.mobile}
              onChange={(e) => update("mobile", e.target.value)}
            />
          </Field>
          <Field label="Password" hint="Minimum 8 characters.">
            <TextInput
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </Field>
          <Field label="User Type">
            <Select value={form.user_type} onChange={(e) => update("user_type", e.target.value)}>
              <option>Admin</option>
              <option>Security</option>
              <option>Reception</option>
              <option>Manager</option>
            </Select>
          </Field>
          <Field label="Role">
            <Select value={form.role_id} onChange={(e) => update("role_id", e.target.value)}>
              <option value="">Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.is_system ? "(system)" : ""}
                </option>
              ))}
            </Select>
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
                <UserRound className="h-4 w-4" />
              )}
              Create User Account
            </Button>
          </div>
        </form>
      </Card>

      <Card className="mt-6">
        <div className="border-b border-line">
          <h2 className="px-5 py-4 text-sm font-bold uppercase tracking-[0.08em] text-ink">
            User Accounts
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5">User</th>
                <th className="px-5 py-2.5">Role</th>
                <th className="px-5 py-2.5">Type</th>
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted">
                    No user accounts yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-line-soft text-[13px] hover:bg-canvas">
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-white">
                          <UserRound className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="font-medium text-ink">{u.full_name}</p>
                          <p className="flex items-center gap-1 text-xs text-muted">
                            <Mail className="h-3 w-3" /> {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-accent-strong">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {u.role_label ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted">{u.user_type ?? "—"}</td>
                    <td className="px-5 py-3">
                      {u.mobile ? (
                        <span className="flex items-center gap-1 text-muted">
                          <Phone className="h-3 w-3" /> {u.mobile}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {u.locked_out ? (
                        <StatusBadge tone="warning">Locked</StatusBadge>
                      ) : u.active ? (
                        <StatusBadge tone="success">Active</StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">Inactive</StatusBadge>
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