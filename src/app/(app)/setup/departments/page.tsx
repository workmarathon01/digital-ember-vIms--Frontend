"use client";

import {
  Building2,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Field, Textarea, TextInput } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  updateDepartment,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import type { Department } from "@/lib/types";

const emptyForm = {
  name: "",
  code: "",
  description: "",
  active: true,
};

type FormState = typeof emptyForm;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "The request could not be completed.";
}

export default function DepartmentsPage() {
  const { user } = useAuth();
  const canCreate = can(user, "departments", "create");
  const canUpdate = can(user, "departments", "update");
  const canDelete = can(user, "departments", "destroy");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const showForm = editingId ? canUpdate : canCreate;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const response = await fetchDepartments();
      setDepartments(response.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial loading is async; state updates happen after the network round-trip.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false);
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(department: Department) {
    setEditingId(department.id);
    setForm({
      name: department.name,
      code: department.code,
      description: department.description ?? "",
      active: department.active,
    });
    setNotice(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    setError(null);

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      description: form.description.trim() || undefined,
      active: form.active,
    };

    try {
      if (editingId) {
        const updated = await updateDepartment(editingId, payload);
        setNotice(`${updated.name} updated.`);
      } else {
        const created = await createDepartment(payload);
        setNotice(`${created.name} created.`);
      }

      resetForm();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(department: Department) {
    const assigned =
      department.users_count > 0
        ? ` ${department.users_count} user${
            department.users_count === 1 ? "" : "s"
          } will be left without a department.`
        : "";
    if (!window.confirm(`Delete ${department.name}?${assigned}`)) return;

    setDeletingId(department.id);
    setNotice(null);
    setError(null);

    try {
      await deleteDepartment(department.id);
      if (editingId === department.id) resetForm();
      setNotice(`${department.name} deleted.`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">Departments</h2>
          <p className="mt-1 text-sm text-muted">
            Create the departments that users can be assigned to.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-muted">
          <Building2 className="h-3.5 w-3.5" />
          {departments.length} department{departments.length === 1 ? "" : "s"}
        </span>
      </div>

      {notice ? (
        <div className="mb-5 rounded-lg border border-success/30 bg-success-bg px-4 py-3 text-sm font-medium text-success">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mb-5 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-sm font-medium text-warn">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <Card className="p-6">
          <h3 className="mb-5 text-sm font-bold uppercase tracking-[0.08em] text-ink">
            {editingId ? "Edit Department" : "Add Department"}
          </h3>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <Field label="Department name" required>
              <TextInput
                required
                maxLength={120}
                placeholder="e.g. Housekeeping"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </Field>
            <Field
              label="Code"
              hint="Leave blank to generate a code from the name."
            >
              <TextInput
                maxLength={24}
                placeholder="e.g. HOUSEKEEPING"
                value={form.code}
                onChange={(event) => update("code", event.target.value)}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <Textarea
                  maxLength={1000}
                  placeholder="What is this department responsible for?"
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink md:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => update("active", event.target.checked)}
              />
              Active
            </label>
            <div className="flex flex-wrap items-center gap-2 md:col-span-2">
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingId ? "Update Department" : "Add Department"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  disabled={submitting}
                  onClick={resetForm}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-ink">
            All Departments
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5">Department</th>
                <th className="px-5 py-2.5">Code</th>
                <th className="px-5 py-2.5">Description</th>
                <th className="px-5 py-2.5">Users</th>
                <th className="px-5 py-2.5">Status</th>
                {canUpdate || canDelete ? (
                  <th className="px-5 py-2.5 text-right">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={canUpdate || canDelete ? 6 : 5}
                    className="px-5 py-8 text-center"
                  >
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-muted" />
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td
                    colSpan={canUpdate || canDelete ? 6 : 5}
                    className="px-5 py-8 text-center text-sm text-muted"
                  >
                    No departments yet. Add the first one above.
                  </td>
                </tr>
              ) : (
                departments.map((department) => (
                  <tr
                    key={department.id}
                    className="border-b border-line-soft text-[13px] hover:bg-canvas"
                  >
                    <td className="py-3 pl-5 pr-4">
                      <p className="font-medium text-ink">{department.name}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded bg-canvas-2 px-2 py-0.5 font-mono text-[11px] text-muted">
                        {department.code}
                      </span>
                    </td>
                    <td className="max-w-xs px-5 py-3 text-muted">
                      {department.description ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {department.users_count}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={department.active ? "success" : "warning"}>
                        {department.active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    {canUpdate || canDelete ? (
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(department)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={deletingId === department.id}
                              onClick={() => void remove(department)}
                            >
                              {deletingId === department.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
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
