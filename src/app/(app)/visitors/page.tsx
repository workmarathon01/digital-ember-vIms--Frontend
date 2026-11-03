"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Car,
  ClipboardList,
  Download,
  Loader2,
  MapPin,
  Phone,
  QrCode,
  RefreshCw,
  User as UserIcon,
  X,
} from "lucide-react";
import { Button, Card, Field, Select, TextInput } from "@/components/ui";
import { ProfileImageInput } from "@/components/profile-image-input";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { createVisitor, fetchLocationDirectory, fetchVisitors } from "@/lib/api";
import { fetchHosts } from "@/lib/public-api";
import {
  buildingsForSite,
  findUnit,
  floorsForBuilding,
  unitsForFloor,
} from "@/lib/locations";
import type {
  Building,
  Floor,
  PublicHost,
  Site,
  Unit,
  User as AuthUser,
  Visitor,
} from "@/lib/types";

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
  site_id: "",
  building_id: "",
  floor_id: "",
  unit_id: "",
  vhost_id: "",
};

type FormState = typeof initialForm;

function isEmployee(user: AuthUser | null): boolean {
  return Boolean(
    user && (user.user_type === "employee" || user.role_key === "staff"),
  );
}

// Employees create visitors for their own workplace, so start from the
// location and host stored on their profile.
function initialFormFor(user: AuthUser | null): FormState {
  if (!isEmployee(user) || !user) return initialForm;

  return {
    ...initialForm,
    site_id: user.current_site_id ? String(user.current_site_id) : "",
    building_id: user.building_id ? String(user.building_id) : "",
    floor_id: user.floor_id ? String(user.floor_id) : "",
    unit_id: user.unit_id ? String(user.unit_id) : "",
    vhost_id: String(user.id),
  };
}

function formatExpectedTime(raw: string | null): string {
  if (!raw) return "";
  return new Date(raw).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VisitorsPage() {
  const { user } = useAuth();
  const canCreateVisitor = can(user, "visitors", "create");
  const [form, setForm] = useState<FormState>(() => initialFormFor(user));
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrVisitor, setQrVisitor] = useState<Visitor | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [options, setOptions] = useState<{
    sites: Site[];
    buildings: Building[];
    floors: Floor[];
    units: Unit[];
  }>({
    sites: [],
    buildings: [],
    floors: [],
    units: [],
  });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [hosts, setHosts] = useState<PublicHost[]>([]);
  const [hostsLoading, setHostsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const hostsRequest = useRef(0);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openQr(visitor: Visitor) {
    setQrImage(null);
    setQrVisitor(visitor);
  }

  function closeQr() {
    setQrVisitor(null);
    setQrImage(null);
  }

  useEffect(() => {
    if (!qrVisitor) return;

    const token = qrVisitor.qr_token || qrVisitor.pass_code;
    if (!token) return;

    const base = typeof window === "undefined" ? "" : window.location.origin;
    const payload = base
      ? `${base}/scan/?t=${encodeURIComponent(token)}`
      : token;
    let cancelled = false;

    void import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(payload, {
          width: 720,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#0a192f", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (!cancelled) setQrImage(url);
      })
      .catch(() => {
        if (!cancelled) setQrImage(null);
      });

    return () => {
      cancelled = true;
    };
  }, [qrVisitor]);

  async function load() {
    try {
      const res = await fetchVisitors();
      setVisitors(res.visitors);
    } finally {
      setLoading(false);
    }
  }

  const loadHosts = useCallback(async (unitId: string) => {
    const requestId = ++hostsRequest.current;

    if (!unitId) {
      setHosts([]);
      setHostsLoading(false);
      return;
    }

    setHostsLoading(true);
    try {
      const data = await fetchHosts(Number(unitId));
      if (requestId === hostsRequest.current) setHosts(data.hosts ?? []);
    } catch {
      if (requestId === hostsRequest.current) setHosts([]);
    } finally {
      if (requestId === hostsRequest.current) setHostsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchVisitors()
      .then((res) => {
        if (!cancelled) setVisitors(res.visitors);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    void fetchLocationDirectory()
      .then((data) => {
        if (cancelled) return;
        setOptions(data);
        const defaults = initialFormFor(user);
        if (defaults.unit_id) void loadHosts(defaults.unit_id);
      })
      .catch(() => {
        if (!cancelled)
          setOptions({ sites: [], buildings: [], floors: [], units: [] });
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, loadHosts]);

  // Preselect the site the user is attached to so site-scoped accounts do not
  // have to pick their only site for every new visitor. This is derived during
  // render instead of copied into state, so resetting the form falls back to it.
  const preferredSite =
    options.sites.find((site) => site.id === user?.current_site_id) ??
    (options.sites.length === 1 ? options.sites[0] : null);
  const selectedSiteId = form.site_id || (preferredSite ? String(preferredSite.id) : "");

  const buildingsForSelectedSite = buildingsForSite(
    options.buildings,
    selectedSiteId,
  );
  const floorsForSelectedBuilding = floorsForBuilding(
    options.floors,
    form.building_id,
  );
  const unitsForSelectedFloor = unitsForFloor(
    options.units,
    form.floor_id,
  );
  const selectedHostMissing =
    Boolean(form.vhost_id) &&
    !hosts.some((host) => String(host.id) === form.vhost_id);

  function selectSite(siteId: string) {
    setForm((current) => ({
      ...current,
      site_id: siteId,
      building_id: "",
      floor_id: "",
      unit_id: "",
      vhost_id: "",
    }));

    void loadHosts("");
  }

  function selectBuilding(buildingId: string) {
    setForm((current) => ({
      ...current,
      building_id: buildingId,
      floor_id: "",
      unit_id: "",
      vhost_id: "",
    }));

    void loadHosts("");
  }

  function selectFloor(floorId: string) {
    setForm((current) => ({
      ...current,
      floor_id: floorId,
      unit_id: "",
      vhost_id: "",
    }));

    void loadHosts("");
  }

  function selectUnit(unitId: string) {
    const unit = findUnit(options.units, unitId);
    setForm((current) => ({
      ...current,
      unit_id: unitId,
      site_id: unit ? String(unit.site_id) : current.site_id,
      building_id: unit ? String(unit.building_id) : current.building_id,
      floor_id: unit ? String(unit.floor_id) : current.floor_id,
      vhost_id: "",
    }));
    void loadHosts(unitId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!form.expected_date || !form.expected_time) {
      setError("Expected date and time are required.");
      return;
    }

    setSubmitting(true);
    try {
      const visitor = await createVisitor(
        {
          ...form,
          created_by_id: user?.id,
          site_id: selectedSiteId ? Number(selectedSiteId) : undefined,
          building_id: form.building_id ? Number(form.building_id) : undefined,
          floor_id: form.floor_id ? Number(form.floor_id) : undefined,
          unit_id: form.unit_id ? Number(form.unit_id) : undefined,
          vhost_id: form.vhost_id ? Number(form.vhost_id) : undefined,
        },
        profileImage,
      );
      setNotice(
        `Visitor pass ${visitor.pass_code ?? "issued"} successfully. The QR pass is ready to share.`,
      );
      const defaults = initialFormFor(user);
      setForm(defaults);
      setProfileImage(null);
      setProfilePreview(null);
      void loadHosts(defaults.unit_id);
      openQr(visitor);
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

      {error ? (
        <p className="mb-5 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-[13px] font-medium text-warn">
          {error}
        </p>
      ) : null}

      {canCreateVisitor ? (
        <Card className="p-6">
          <h2 className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-ink">
            New Visitor Pass
          </h2>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="Full Name" required>
            <TextInput
              required
              placeholder="e.g. Aniket Parkar"
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
          <div className="md:col-span-2">
            <Field
              label="Profile Photo"
              hint="Use the phone camera or choose a photo. The image is resized automatically."
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
          <Field label="Site">
            <Select
              value={selectedSiteId}
              onChange={(e) => selectSite(e.target.value)}
              disabled={optionsLoading}
            >
              <option value="">Select a site</option>
              {options.sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.display_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Building" hint="Only buildings at the selected site are listed.">
            <Select
              value={form.building_id}
              onChange={(e) => selectBuilding(e.target.value)}
              disabled={
                optionsLoading ||
                !selectedSiteId ||
                buildingsForSelectedSite.length === 0
              }
            >
              <option value="">
                {!selectedSiteId
                  ? "Select a site first"
                  : buildingsForSelectedSite.length === 0
                    ? "No buildings at this site"
                    : "Select a building (optional)"}
              </option>
              {buildingsForSelectedSite.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Floor" hint="Only floors in the selected building are listed.">
            <Select
              value={form.floor_id}
              onChange={(e) => selectFloor(e.target.value)}
              disabled={
                !form.building_id || floorsForSelectedBuilding.length === 0
              }
            >
              <option value="">
                {!form.building_id
                  ? "Select a building first"
                  : floorsForSelectedBuilding.length === 0
                    ? "No floors in this building"
                    : "Select a floor (optional)"}
              </option>
              {floorsForSelectedBuilding.map((floor) => (
                <option key={floor.id} value={floor.id}>
                  {floor.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Visiting Unit"
            hint={
              form.floor_id
                ? "Select the unit the visitor is going to."
                : "Select a site, building and floor first."
            }
          >
            <Select
              value={form.unit_id}
              onChange={(e) => selectUnit(e.target.value)}
              disabled={
                optionsLoading ||
                !form.floor_id ||
                unitsForSelectedFloor.length === 0
              }
            >
              <option value="">
                {!form.floor_id
                  ? "Select a floor first"
                  : unitsForSelectedFloor.length === 0
                    ? "No units on this floor"
                    : "Select a unit (optional)"}
              </option>
              {unitsForSelectedFloor.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Host / Resident"
            hint={
              form.unit_id
                ? "Optional — the person the visitor is meeting."
                : "Select a unit to see its hosts."
            }
          >
            <Select
              value={form.vhost_id}
              onChange={(e) => update("vhost_id", e.target.value)}
              disabled={
                !form.unit_id ||
                hostsLoading ||
                (hosts.length === 0 && !selectedHostMissing)
              }
            >
              <option value="">
                {!form.unit_id
                  ? "Select a unit first"
                  : hostsLoading
                    ? "Loading hosts…"
                    : hosts.length === 0
                      ? "No hosts found for this unit"
                      : "Select host (optional)"}
              </option>
              {selectedHostMissing ? (
                <option value={form.vhost_id}>Current host</option>
              ) : null}
              {hosts.map((host) => (
                <option key={host.id} value={host.id}>
                  {host.full_name}
                  {host.role_label ? ` — ${host.role_label}` : ""}
                </option>
              ))}
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
          <Field label="Expected Date" required>
            <TextInput
              type="date"
              required
              value={form.expected_date}
              onChange={(e) => update("expected_date", e.target.value)}
            />
          </Field>
          <Field label="Expected Time" required>
            <TextInput
              type="time"
              required
              value={form.expected_time}
              onChange={(e) => update("expected_time", e.target.value)}
            />
          </Field>
          <Field label="Vehicle Number" 
          // hint="Optional — logged for vehicle passes."
          >
            <TextInput
              placeholder="e.g. MH 01 AB 1234"
              value={form.vehicle_number}
              onChange={(e) => update("vehicle_number", e.target.value)}
            />
          </Field>

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
      ) : null}

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
                <th className="px-5 py-2.5 text-right">QR</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-muted" />
                  </td>
                </tr>
              ) : visitors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">
                    No passes issued yet.
                  </td>
                </tr>
              ) : (
                visitors.map((v) => (
                  <tr key={v.id} className="border-b border-line-soft text-[13px] hover:bg-canvas">
                    <td className="py-3 pl-5 pr-4">
                      <div className="flex items-center gap-2.5">
                        {v.profile_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.profile_image_url}
                            alt={`Profile photo of ${v.name}`}
                            className="h-8 w-8 rounded-full border border-line object-cover"
                          />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-info-bg text-info">
                            <UserIcon className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-ink">{v.name}</p>
                          <p className="flex items-center gap-1 text-xs text-muted">
                            <Phone className="h-3 w-3" /> {v.contact_no ?? "—"}
                          </p>
                          {v.host_name ? (
                            <p className="text-xs text-muted">Host: {v.host_name}</p>
                          ) : null}
                          {v.created_by_name ? (
                            <p className="text-xs text-muted">
                              Created by: {v.created_by_name}
                            </p>
                          ) : null}
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
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openQr(v)}
                        title="Show visitor QR pass"
                        className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[11px] font-semibold text-accent-strong transition hover:bg-info-bg"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {qrVisitor ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`QR pass for ${qrVisitor.name}`}
          onClick={closeQr}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-line bg-card p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {qrVisitor.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrVisitor.profile_image_url}
                    alt={`Profile photo of ${qrVisitor.name}`}
                    className="h-11 w-11 rounded-full border border-line object-cover"
                  />
                ) : null}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Visitor QR pass
                  </p>
                  <h3 className="mt-0.5 text-lg font-bold text-navy">
                    {qrVisitor.name}
                  </h3>
                  <p className="text-xs font-medium text-accent-strong">
                    {qrVisitor.pass_code ?? "—"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeQr}
                aria-label="Close QR pass"
                className="rounded-md p-1 text-muted transition hover:bg-canvas-2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-white p-4">
              {qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImage}
                  alt={`QR pass for ${qrVisitor.name}`}
                  className="h-56 w-56"
                />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted" />
                </div>
              )}
              <p className="text-center text-[11px] text-muted">
                Scan at the entrance to verify and check in.
              </p>
            </div>

            <div className="mt-4 space-y-1.5 text-xs text-muted">
              <p>
                <span className="font-semibold text-ink">Valid from:</span>{" "}
                {qrVisitor.start_pass
                  ? new Date(qrVisitor.start_pass).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "—"}
              </p>
              <p>
                <span className="font-semibold text-ink">Valid until:</span>{" "}
                {qrVisitor.end_pass
                  ? new Date(qrVisitor.end_pass).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "—"}
              </p>
              {qrVisitor.location_label ? (
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {qrVisitor.location_label}
                </p>
              ) : null}
            </div>

            {/* {qrVisitor.pass_url ? (
              <div className="mt-4 rounded-lg border border-line bg-canvas px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Visitor pass link
                </p>
                <p className="mt-1 break-all text-[11px] font-medium text-accent-strong">
                  {qrVisitor.pass_url}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <CopyLinkButton
                    value={qrVisitor.pass_url}
                    label="Copy link"
                    className="px-2.5 py-1.5 text-[11px]"
                  />
                  <a
                    href={qrVisitor.pass_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11px] font-semibold text-ink transition hover:bg-canvas-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                </div>
              </div>
            ) : null} */}

            <div className="mt-5 flex gap-2">
              {qrImage ? (
                <a
                  href={qrImage}
                  download={`access-pass-${qrVisitor.pass_code ?? qrVisitor.id}.png`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-card px-3 py-2.5 text-xs font-semibold text-ink transition hover:bg-canvas-2"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              ) : null}
              <Button type="button" variant="navy" onClick={closeQr} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}