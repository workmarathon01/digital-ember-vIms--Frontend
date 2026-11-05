"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserCog,
  UserPlus,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { Button, Card, Field, Select, TextInput } from "@/components/ui";
import { ProfileImageInput } from "@/components/profile-image-input";
import { StatusBadge } from "@/components/status-badge";
import {
  approveUserRegistration,
  createUser,
  fetchDepartments,
  fetchLocationDirectory,
  fetchPendingRegistrations,
  fetchRoles,
  fetchUsers,
  rejectUserRegistration,
  updateUser,
} from "@/lib/api";
import {
  buildingsForSite,
  findUnit,
  floorsForBuilding,
  unitsForFloor,
} from "@/lib/locations";
import type {
  Building,
  Department,
  Floor,
  PaginationMeta,
  Role,
  Site,
  Unit,
  User,
} from "@/lib/types";

const initialForm = {
  email: "",
  firstname: "",
  lastname: "",
  mobile: "",
  password: "",
  user_type: "",
  role_id: "",
  department_id: "",
  current_site_id: "",
  building_id: "",
  floor_id: "",
  unit_id: "",
};

type FormState = typeof initialForm;

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString([], { dateStyle: "medium", timeZone: "Asia/Kolkata" });
}

export default function UsersPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const canCreateUsers = can(user, "users", "create");
  const canUpdateUsers = can(user, "users", "update");
  const canApproveUsers =
    can(user, "users", "approve") || can(user, "users", "update");
  const canManageUsers = canUpdateUsers;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function load(pageNumber = page) {
    setLoading(true);
    try {
      const userRes = await fetchUsers(pageNumber);
      setUsers(userRes.data);
      setMeta(userRes.meta);
      setPage(userRes.meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions() {
    if (!canCreateUsers && !canUpdateUsers) return;

    try {
      const departmentRequest = can(user, "departments", "read")
        ? fetchDepartments()
        : Promise.resolve({ data: [] as Department[] });
      const [roleRes, locationRes, departmentRes] = await Promise.all([
        fetchRoles(),
        fetchLocationDirectory(),
        departmentRequest,
      ]);
      setRoles(roleRes.data);
      setSites(locationRes.sites);
      setBuildings(locationRes.buildings);
      setFloors(locationRes.floors);
      setUnits(locationRes.units);
      setDepartments(departmentRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load form options.");
    }
  }

  async function loadPending() {
    setPendingLoading(true);
    try {
      const response = await fetchPendingRegistrations();
      setPendingUsers(response.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load pending employee registrations.",
      );
    } finally {
      setPendingLoading(false);
    }
  }

  async function reviewRegistration(
    target: User,
    action: "approve" | "reject",
  ) {
    setActingId(target.id);
    setError(null);
    setNotice(null);

    try {
      const updated =
        action === "approve"
          ? await approveUserRegistration(target.id)
          : await rejectUserRegistration(target.id);

      setPendingUsers((current) =>
        current.filter((item) => item.id !== target.id),
      );
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(
        action === "approve"
          ? `${updated.full_name}'s employee registration was approved. They can now sign in.`
          : `${updated.full_name}'s employee registration was rejected.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not review this employee registration.",
      );
    } finally {
      setActingId(null);
    }
  }

  async function copyRegistrationLink() {
    const url = `${window.location.origin}/self-register/employee/`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      setNotice("Employee registration link copied. Share it with your team.");
    } catch {
      setError("Could not copy the link. Copy it from the address bar instead.");
    }
  }

  useEffect(() => {
    // Initial loading is async; state updates happen after the network round-trip.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(1);
    void loadOptions();
    // The initial loader is intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only reviewers may read the pending queue; other users would get a 403.
    if (!canApproveUsers) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPending();
  }, [canApproveUsers]);

  function resetForm() {
    setForm(initialForm);
    setEditingUserId(null);
    setProfileImage(null);
    setProfilePreview(null);
    setError(null);
  }

  function startEdit(selected: User) {
    const selectedUnit = findUnit(units, selected.unit_id);
    setEditingUserId(selected.id);
    setForm({
      email: selected.email ?? "",
      firstname: selected.firstname ?? "",
      lastname: selected.lastname ?? "",
      mobile: selected.mobile ?? "",
      password: "",
      user_type: selected.user_type ?? "",
      role_id: selected.role_id ? String(selected.role_id) : "",
      department_id: selected.department_id ? String(selected.department_id) : "",
      current_site_id: String(
        selected.current_site_id ?? selectedUnit?.site_id ?? "",
      ),
      building_id: String(selected.building_id ?? selectedUnit?.building_id ?? ""),
      floor_id: String(selected.floor_id ?? selectedUnit?.floor_id ?? ""),
      unit_id: selected.unit_id ? String(selected.unit_id) : "",
    });
    setProfileImage(null);
    setProfilePreview(selected.profile_image_url ?? null);
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeSite(siteId: string) {
    setForm((current) => ({
      ...current,
      current_site_id: siteId,
      building_id: "",
      floor_id: "",
      unit_id: "",
    }));
  }

  function changeBuilding(buildingId: string) {
    setForm((current) => ({
      ...current,
      building_id: buildingId,
      floor_id: "",
      unit_id: "",
    }));
  }

  function changeFloor(floorId: string) {
    setForm((current) => ({
      ...current,
      floor_id: floorId,
      unit_id: "",
    }));
  }

  function changeUnit(unitId: string) {
    const unit = findUnit(units, unitId);
    setForm((current) => ({
      ...current,
      unit_id: unitId,
      current_site_id: unit ? String(unit.site_id) : current.current_site_id,
      building_id: unit ? String(unit.building_id) : current.building_id,
      floor_id: unit ? String(unit.floor_id) : current.floor_id,
    }));
  }

  async function toggleActive(target: User) {
    setError(null);
    setNotice(null);
    setTogglingId(target.id);
    try {
      const updated = await updateUser(target.id, { active: !target.active });
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(
        `${updated.full_name} is now ${updated.active ? "active" : "inactive"}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update account status.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const params = {
        ...form,
        active: editingUserId ? undefined : true,
        role_id: form.role_id ? Number(form.role_id) : undefined,
        department_id: form.department_id ? Number(form.department_id) : undefined,
        current_site_id: form.current_site_id ? Number(form.current_site_id) : undefined,
        building_id: form.building_id ? Number(form.building_id) : undefined,
        floor_id: form.floor_id ? Number(form.floor_id) : undefined,
        unit_id: form.unit_id ? Number(form.unit_id) : undefined,
      };

      if (editingUserId) {
        const updated = await updateUser(editingUserId, params, profileImage);
        setNotice(`User account ${updated.email} updated successfully.`);
        resetForm();
        await load(page);
      } else {
        const created = await createUser(params, profileImage);
        setNotice(`User account ${created.email} created successfully.`);
        resetForm();
        await load(1);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save user account.");
    } finally {
      setSubmitting(false);
    }
  }

  const availableBuildings = buildingsForSite(buildings, form.current_site_id);
  const availableFloors = floorsForBuilding(floors, form.building_id);
  const availableUnits = unitsForFloor(units, form.floor_id);

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

      {error ? (
        <p className="mb-5 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-[13px] font-medium text-warn">
          {error}
        </p>
      ) : null}

      {canApproveUsers ? (
        <Card className="mb-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-ink">
                <UserPlus className="h-4 w-4 text-accent" />
                Employee Self-Registration
              </h2>
              {/* <p className="mt-1.5 text-[13px] text-muted">
                Share this public link with employees. They can create their own
                account, and a Super Admin or Admin must approve it before they
                can sign in.
              </p>
              <code className="mt-3 inline-block rounded-md border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink">
                /self-register/employee/
              </code> */}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void copyRegistrationLink()}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <a
                href="/self-register/employee/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-canvas-2"
              >
                Preview
              </a>
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-[13px] font-bold text-ink">
                <Clock className="h-4 w-4 text-warn" />
                Pending approvals
                {pendingUsers.length > 0 ? (
                  <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-semibold text-warn">
                    {pendingUsers.length}
                  </span>
                ) : null}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void loadPending()}
                disabled={pendingLoading}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${pendingLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            {pendingLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading registrations…
              </div>
            ) : pendingUsers.length === 0 ? (
              <p className="rounded-lg border border-line-soft bg-canvas px-4 py-4 text-[13px] text-muted">
                No employee registrations are waiting for approval.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted">
                      <th className="px-4 py-2.5">Employee</th>
                      <th className="px-4 py-2.5">Position</th>
                      <th className="px-4 py-2.5">Work location</th>
                      <th className="px-4 py-2.5">Submitted</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map((pendingUser) => (
                      <tr
                        key={pendingUser.id}
                        className="border-b border-line-soft text-[13px] last:border-b-0"
                      >
                        <td className="py-3 pl-4 pr-3">
                          <div className="flex items-center gap-2.5">
                            {pendingUser.profile_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={pendingUser.profile_image_url}
                                alt=""
                                className="h-8 w-8 rounded-full border border-line object-cover"
                              />
                            ) : (
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-info-bg text-info">
                                <UserRound className="h-4 w-4" />
                              </span>
                            )}
                            <div>
                              <p className="font-medium text-ink">
                                {pendingUser.full_name}
                              </p>
                              <p className="text-xs text-muted">
                                {pendingUser.email}
                                {pendingUser.mobile
                                  ? ` · ${pendingUser.mobile}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {pendingUser.position ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {pendingUser.site_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatDate(
                            pendingUser.registration_submitted_at ??
                              pendingUser.created_at,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={actingId === pendingUser.id}
                              onClick={() =>
                                void reviewRegistration(pendingUser, "approve")
                              }
                            >
                              {actingId === pendingUser.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              disabled={actingId === pendingUser.id}
                              onClick={() =>
                                void reviewRegistration(pendingUser, "reject")
                              }
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      ) : null}

      {canCreateUsers || canUpdateUsers ? (
        <Card className="p-6">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-[0.08em] text-ink">
            {editingUserId ? "Edit User Account" : "Create User Account"}
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="First Name" required>
            <TextInput
              required
              placeholder="e.g. Aniket"
              value={form.firstname}
              onChange={(e) => update("firstname", e.target.value)}
            />
          </Field>
          <Field label="Last Name" required>
            <TextInput
              required
              placeholder="e.g. Parkar"
              value={form.lastname}
              onChange={(e) => update("lastname", e.target.value)}
            />
          </Field>
          <Field label="Email Address" required>
            <TextInput
              type="email"
              required
              placeholder="aniketparkar@yahoo.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>
          <Field label="Mobile Number">
            <TextInput
              placeholder="e.g. 9876543210"
              value={form.mobile}
              onChange={(e) => update("mobile", e.target.value)}
            />
          </Field>
          <Field
            label="Password"
            required={!editingUserId}
            hint={
              editingUserId
                ? "Leave blank to keep the current password."
                : "Minimum 12 characters."
            }
          >
            <TextInput
              type="password"
              required={!editingUserId}
              minLength={12}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </Field>
          <div className="md:col-span-2">
            <Field
              label="Profile Photo"
              hint="Upload a photo or take one with your camera."
            >
              <ProfileImageInput
                file={profileImage}
                preview={profilePreview}
                onChange={(file, preview) => {
                  setProfileImage(file);
                  setProfilePreview(preview);
                }}
              />
            </Field>
          </div>
          <Field
            label="User Type"
            hint="The role is assigned automatically from the selected user type."
          >
            <Select
              value={form.user_type}
              onChange={(e) => {
                const userType = e.target.value;
                const matched = roles.find((role) => role.key === userType);
                setForm((current) => ({
                  ...current,
                  user_type: userType,
                  role_id: matched ? String(matched.id) : "",
                }));
              }}
            >
              <option value="">Select user type</option>
              {form.user_type &&
              !roles.some((role) => role.key === form.user_type) ? (
                <option value={form.user_type}>{form.user_type}</option>
              ) : null}
              {roles
                .filter(
                  (role) => user?.role_key === "super_admin" || role.key !== "super_admin",
                )
                .map((role) => (
                  <option key={role.id} value={role.key}>
                    {role.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field
            label="Role"
            hint="Set automatically from the user type."
          >
            <Select
              value={form.role_id}
              disabled={roles.some((role) => role.key === form.user_type)}
            >
              <option value="">Select role</option>
              {roles
                .filter(
                  (r) => user?.role_key === "super_admin" || r.key !== "super_admin",
                )
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.is_system ? "(system)" : ""}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Department" 
          // hint="Managed from Setup → Departments."
          >
            <Select
              value={form.department_id}
              onChange={(e) => update("department_id", e.target.value)}
            >
              <option value="">
                {departments.length === 0 ? "No departments available" : "Select Department"}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                  {department.active ? "" : " (inactive)"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Primary site">
            <Select
              value={form.current_site_id}
              onChange={(e) => changeSite(e.target.value)}
            >
              <option value="">Select Site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Building" 
          // hint="Only buildings at the selected site are listed."
          
          >
            <Select
              value={form.building_id}
              onChange={(e) => changeBuilding(e.target.value)}
              disabled={!form.current_site_id || availableBuildings.length === 0}
            >
              <option value="">
                {!form.current_site_id
                  ? "Select a site first"
                  : availableBuildings.length === 0
                    ? "No buildings at this site"
                    : "No building / site-only"}
              </option>
              {availableBuildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Floor" 
          // hint="Only floors in the selected building are listed."
          >
            <Select
              value={form.floor_id}
              onChange={(e) => changeFloor(e.target.value)}
              disabled={!form.building_id || availableFloors.length === 0}
            >
              <option value="">
                {!form.building_id
                  ? "Select a building first"
                  : availableFloors.length === 0
                    ? "No floors in this building"
                    : "No floor / building-only"}
              </option>
              {availableFloors.map((floor) => (
                <option key={floor.id} value={floor.id}>
                  {floor.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Primary unit" 
          // hint="Only units on the selected floor are listed."
          >
            <Select
              value={form.unit_id}
              onChange={(e) => changeUnit(e.target.value)}
              disabled={!form.floor_id || availableUnits.length === 0}
            >
              <option value="">
                {!form.floor_id
                  ? "Select a floor first"
                  : availableUnits.length === 0
                    ? "No units on this floor"
                    : "No unit / floor-only"}
              </option>
              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-wrap items-center gap-2 md:col-span-2">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserRound className="h-4 w-4" />
              )}
              {editingUserId ? "Update User Account" : "Create User Account"}
            </Button>
            {editingUserId ? (
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
                <th className="px-5 py-2.5">Residence</th>
                <th className="px-5 py-2.5">Contact</th>
                <th className="px-5 py-2.5">Status</th>
                {canUpdateUsers ? (
                  <th className="px-5 py-2.5 text-right">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canUpdateUsers ? 7 : 6} className="px-5 py-8 text-center">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-muted" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={canUpdateUsers ? 7 : 6} className="px-5 py-8 text-center text-sm text-muted">
                    No user accounts yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-line-soft text-[13px] hover:bg-canvas">
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-2.5">
                        {u.profile_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.profile_image_url}
                            alt=""
                            className="h-7 w-7 rounded-full border border-line object-cover"
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-white">
                            <UserRound className="h-3.5 w-3.5" />
                          </span>
                        )}
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
                      {u.residence_label ? (
                        <span className="flex items-center gap-1 text-muted">
                          <MapPin className="h-3 w-3" /> {u.residence_label}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
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
                      {u.registration_status === "pending" ? (
                        <StatusBadge tone="warning">Pending approval</StatusBadge>
                      ) : u.registration_status === "rejected" ? (
                        <StatusBadge tone="warning">Rejected</StatusBadge>
                      ) : (
                        <div className="flex items-center gap-2">
                          {u.locked_out ? (
                            <StatusBadge tone="warning">Locked</StatusBadge>
                          ) : null}
                          {canManageUsers ? (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={u.active}
                              aria-label={`${u.active ? "Deactivate" : "Activate"} ${u.full_name}`}
                              title={
                                u.id === user?.id
                                  ? "You cannot change your own account status."
                                  : undefined
                              }
                              disabled={togglingId === u.id || u.id === user?.id}
                              onClick={() => void toggleActive(u)}
                              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                u.active ? "bg-success" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                  u.active ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          ) : null}
                          <span
                            className={`text-xs font-medium ${
                              u.active ? "text-success" : "text-muted"
                            }`}
                          >
                            {u.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      )}
                    </td>
                    {canUpdateUsers ? (
                      <td className="px-5 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {meta ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-xs text-muted">
            <span>
              Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.count} record
              {meta.count === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!meta.prev || loading}
                onClick={() => void load(meta.prev!)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <span>
                Page {meta.page} of {meta.pages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!meta.next || loading}
                onClick={() => void load(meta.next!)}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
