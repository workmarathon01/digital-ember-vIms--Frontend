"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  QrCode,
  RefreshCw,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand-logo";
import { CopyLinkButton } from "@/components/copy-link-button";
import { FooterBanner } from "@/components/footer-banner";
import { ProfileImageInput } from "@/components/profile-image-input";
import { Button, Card, Field, Select, TextInput } from "@/components/ui";
import {
  fetchHosts,
  fetchPublicFormOptions,
  lookupVisitor,
  registerVisitor,
} from "@/lib/public-api";
import type {
  PublicFormOptions,
  PublicHost,
  PublicVisitor,
  PublicVisitorLookup,
} from "@/lib/types";

type Stage = "phone" | "details" | "pass";

type FormState = {
  name: string;
  contact_no: string;
  purpose: string;
  coming_from: string;
  visit_type: string;
  expected_date: string;
  expected_time: string;
  vehicle_number: string;
  site_id: string;
  building_id: string;
  floor_id: string;
  unit_id: string;
  vhost_id: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  contact_no: "",
  purpose: "",
  coming_from: "",
  visit_type: "One Time",
  expected_date: "",
  expected_time: "",
  vehicle_number: "",
  site_id: "",
  building_id: "",
  floor_id: "",
  unit_id: "",
  vhost_id: "",
};

const PURPOSE_OPTIONS = [
  "Meeting",
  "Interview",
  "Delivery",
  "Maintenance",
  "Office Work",
  "Vendor",
  "Other",
];

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 15);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function SelfRegisterPage() {
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [options, setOptions] = useState<PublicFormOptions>({ sites: [], units: [] });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [lookup, setLookup] = useState<PublicVisitorLookup | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pass, setPass] = useState<PublicVisitor | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [hosts, setHosts] = useState<PublicHost[]>([]);
  const [hostsLoading, setHostsLoading] = useState(false);
  const lookupInFlight = useRef(false);
  const hostsRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void fetchPublicFormOptions()
      .then((data) => {
        if (!cancelled) setOptions(data);
      })
      .catch(() => {
        // Site/unit selection is optional; the form still works without it.
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (requestId === hostsRequest.current) {
        const nextHosts = data.hosts ?? [];
        setHosts(nextHosts);
        setForm((current) => {
          if (!current.vhost_id) return current;
          return nextHosts.some((host) => String(host.id) === current.vhost_id)
            ? current
            : { ...current, vhost_id: "" };
        });
      }
    } catch {
      if (requestId === hostsRequest.current) setHosts([]);
    } finally {
      if (requestId === hostsRequest.current) setHostsLoading(false);
    }
  }, []);

  const runLookup = useCallback(
    async (rawPhone: string) => {
      const contactNo = digitsOnly(rawPhone);
      if (contactNo.length < 10) {
        setError("Enter a valid mobile number with at least 10 digits.");
        return;
      }
      if (lookupInFlight.current) return;

      lookupInFlight.current = true;
      setChecking(true);
      setError(null);

      try {
        const result = await lookupVisitor(contactNo);
        setLookup(result);

        if (result.visitor) {
          const existing = result.visitor;
          const unitId = existing.unit_id ? String(existing.unit_id) : "";
          const matchedUnit = options.units.find(
            (unit) => String(unit.id) === unitId,
          );
          setForm((current) => ({
            ...current,
            name: existing.name ?? "",
            contact_no: existing.contact_no ?? contactNo,
            purpose: existing.purpose ?? "",
            coming_from: existing.coming_from ?? "",
            visit_type: existing.visit_type ?? "One Time",
            vehicle_number: existing.vehicle_number ?? "",
            site_id: existing.site_id ? String(existing.site_id) : "",
            building_id: String(
              existing.building_id ?? matchedUnit?.building_id ?? "",
            ),
            floor_id: String(existing.floor_id ?? matchedUnit?.floor_id ?? ""),
            unit_id: unitId,
            vhost_id: existing.vhost_id ? String(existing.vhost_id) : "",
          }));
          setProfileImage(null);
          setProfilePreview(null);
          if (unitId) {
            void loadHosts(unitId);
          } else {
            void loadHosts("");
          }
        } else {
          setForm({ ...EMPTY_FORM, contact_no: contactNo });
          setProfileImage(null);
          setProfilePreview(null);
          void loadHosts("");
        }

        setStage("details");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not check this mobile number.",
        );
      } finally {
        lookupInFlight.current = false;
        setChecking(false);
      }
    },
    [loadHosts, options.units],
  );

  // Automatically check the mobile number once 10 digits have been entered.
  useEffect(() => {
    if (stage !== "phone") return;
    const contactNo = digitsOnly(phone);
    if (contactNo.length < 10) return;

    const timer = window.setTimeout(() => {
      void runLookup(contactNo);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [phone, stage, runLookup]);

  const buildingOptions = useMemo(() => {
    if (!form.site_id) return [];
    const seen = new Map<number, { id: number; name: string }>();
    options.units
      .filter((unit) => String(unit.site_id) === form.site_id)
      .forEach((unit) => {
        if (!seen.has(unit.building_id)) {
          seen.set(unit.building_id, {
            id: unit.building_id,
            name: unit.building_name ?? "Building",
          });
        }
      });
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [options.units, form.site_id]);

  const floorOptions = useMemo(() => {
    if (!form.building_id) return [];
    const seen = new Map<number, { id: number; name: string }>();
    options.units
      .filter((unit) => String(unit.building_id) === form.building_id)
      .forEach((unit) => {
        if (!seen.has(unit.floor_id)) {
          seen.set(unit.floor_id, {
            id: unit.floor_id,
            name: unit.floor_name ?? "Floor",
          });
        }
      });
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [options.units, form.building_id]);

  const unitsForSelection = useMemo(() => {
    if (!form.floor_id) return [];
    return options.units.filter(
      (unit) => String(unit.floor_id) === form.floor_id,
    );
  }, [options.units, form.floor_id]);

  const purposeOptions = useMemo(() => {
    return Array.from(
      new Set([...PURPOSE_OPTIONS, form.purpose].filter(Boolean)),
    );
  }, [form.purpose]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

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
    const unit = options.units.find((item) => String(item.id) === unitId);
    setForm((current) => ({
      ...current,
      unit_id: unitId,
      site_id: unit ? String(unit.site_id) : current.site_id,
      building_id: unit ? String(unit.building_id) : current.building_id,
      floor_id: unit ? String(unit.floor_id) : current.floor_id,
      vhost_id: "",
    }));
    if (unitId) {
      void loadHosts(unitId);
    } else {
      void loadHosts("");
    }
  }

  const selectedHostMissing =
    Boolean(form.vhost_id) &&
    !hosts.some((host) => String(host.id) === form.vhost_id);
  const selectedHostName = lookup?.visitor?.host_name ?? "Current host";

  async function handleDetailsSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.expected_date || !form.expected_time) {
      setError("Expected date and time are required.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await registerVisitor(
        {
          name: form.name.trim(),
          contact_no: form.contact_no,
          purpose: form.purpose,
          coming_from: form.coming_from,
          visit_type: form.visit_type,
          expected_date: form.expected_date || undefined,
          expected_time: form.expected_time || undefined,
          vehicle_number: form.vehicle_number || undefined,
          site_id: form.site_id ? Number(form.site_id) : undefined,
          building_id: form.building_id ? Number(form.building_id) : undefined,
          floor_id: form.floor_id ? Number(form.floor_id) : undefined,
          unit_id: form.unit_id ? Number(form.unit_id) : undefined,
          vhost_id: form.vhost_id ? Number(form.vhost_id) : undefined,
        },
        profileImage,
      );
      setPass(response.visitor);
      setStage("pass");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not register the visitor.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const qrPayload = useMemo(() => {
    if (!pass) return "";
    const token = pass.qr_token || pass.pass_code || "";
    if (!token) return "";
    const base = typeof window === "undefined" ? "" : window.location.origin;
    return base ? `${base}/scan/?t=${encodeURIComponent(token)}` : token;
  }, [pass]);

  useEffect(() => {
    if (!qrPayload) return;

    let cancelled = false;
    void import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(qrPayload, {
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
  }, [qrPayload]);

  function startOver() {
    setStage("phone");
    setPhone("");
    setForm(EMPTY_FORM);
    setLookup(null);
    setPass(null);
    setQrImage(null);
    setProfileImage(null);
    setProfilePreview(null);
    void loadHosts("");
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/login" aria-label="VisiTrack home">
            <LogoMark size="lg" />
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <ShieldCheck className="h-4 w-4 text-accent" />
            Secure self registration
          </div>
        </header>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">Visitor Sign-in</h1>
          <p className="mt-2 text-sm text-muted">
            Register yourself in less than a minute. No account or password needed.
          </p>
        </div>

        <StepIndicator stage={stage} />

        {error ? (
          <div className="mb-5 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-[13px] font-medium text-warn">
            {error}
          </div>
        ) : null}

        {stage === "phone" ? (
          <Card className="p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-info-bg text-info">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-ink">
                  Start with your mobile number
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  We&apos;ll check if you&apos;ve visited before.
                </p>
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runLookup(phone);
              }}
              className="flex flex-col gap-4"
            >
              <Field
                label="Mobile Number"
                htmlFor="contact_no"
                required
                // hint="Enter 10–15 digits. If we find your previous visit, your details will be filled automatically."
              >
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <TextInput
                    id="contact_no"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    autoFocus
                    required
                    minLength={10}
                    maxLength={15}
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(event) => setPhone(digitsOnly(event.target.value))}
                    className="pl-9 text-base tracking-wide"
                  />
                </div>
              </Field>

              <Button
                type="submit"
                size="lg"
                disabled={checking || digitsOnly(phone).length < 10}
                className="w-full"
              >
                {checking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {checking ? "Checking records…" : "Continue"}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 border-t border-line-soft pt-5 text-xs text-muted">
              <QrCode className="h-4 w-4" />
              Already have a pass?{" "}
              <Link href="/scan" className="font-semibold text-accent-strong hover:underline">
                Scan your QR code
              </Link>
            </div>
          </Card>
        ) : null}

        {stage === "details" ? (
          <Card className="p-6 sm:p-8">
            {lookup?.registered && lookup.visitor ? (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-success/30 bg-success-bg px-4 py-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-semibold text-success">
                    Welcome back, {lookup.visitor.name}!
                  </p>
                  <p className="mt-0.5 text-xs text-success/90">
                    We found your previous details and filled them in below. Review them and
                    register for a new pass.
                  </p>
                  {lookup.currently_checked_in ? (
                    <p className="mt-1 text-xs font-semibold text-warn">
                      This number is currently checked in. Please contact reception before
                      creating another pass.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-info/20 bg-info-bg px-4 py-3">
                <UserIcon className="mt-0.5 h-5 w-5 shrink-0 text-info" />
                <div>
                  <p className="text-sm font-semibold text-info">New visitor</p>
                  <p className="mt-0.5 text-xs text-info/90">
                    We couldn&apos;t find this mobile number. Fill in your details to create
                    a new pass.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleDetailsSubmit} className="grid gap-4 md:grid-cols-2">
              <Field label="Mobile Number" htmlFor="detail_contact" required>
                <TextInput
                  id="detail_contact"
                  type="tel"
                  inputMode="numeric"
                  required
                  value={form.contact_no}
                  onChange={(event) => update("contact_no", digitsOnly(event.target.value))}
                />
              </Field>
              <Field label="Full Name" htmlFor="detail_name" required>
                <TextInput
                  id="detail_name"
                  required
                  autoComplete="name"
                  placeholder="e.g. Aniket Parkar"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </Field>
              <div className="md:col-span-2">
                <Field
                  label="Profile Photo"
                  hint={
                    lookup?.registered
                      ? "If you've visited before, your previous photo is reused when available."
                      : "Take a clear photo of your face or choose one from your device."
                  }
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
              <Field label="Purpose of Visit" htmlFor="detail_purpose" required>
                <Select
                  id="detail_purpose"
                  required
                  value={form.purpose}
                  onChange={(event) => update("purpose", event.target.value)}
                >
                  <option value="">Select purpose</option>
                  {purposeOptions.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {purpose}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Visit Type" htmlFor="detail_visit_type">
                <Select
                  id="detail_visit_type"
                  value={form.visit_type}
                  onChange={(event) => update("visit_type", event.target.value)}
                >
                  <option>One Time</option>
                  <option>Recurring</option>
                  <option>Vendor</option>
                </Select>
              </Field>
              <Field label="Site" htmlFor="detail_site">
                <Select
                  id="detail_site"
                  value={form.site_id}
                  onChange={(event) => selectSite(event.target.value)}
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
              <Field
                label="Building"
                htmlFor="detail_building"
                hint="Only buildings at the selected site are listed."
              >
                <Select
                  id="detail_building"
                  value={form.building_id}
                  onChange={(event) => selectBuilding(event.target.value)}
                  disabled={!form.site_id || buildingOptions.length === 0}
                >
                  <option value="">
                    {!form.site_id
                      ? "Select a site first"
                      : buildingOptions.length === 0
                        ? "No buildings at this site"
                        : "Select a building (optional)"}
                  </option>
                  {buildingOptions.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Floor"
                htmlFor="detail_floor"
                hint="Only floors in the selected building are listed."
              >
                <Select
                  id="detail_floor"
                  value={form.floor_id}
                  onChange={(event) => selectFloor(event.target.value)}
                  disabled={!form.building_id || floorOptions.length === 0}
                >
                  <option value="">
                    {!form.building_id
                      ? "Select a building first"
                      : floorOptions.length === 0
                        ? "No floors in this building"
                        : "Select a floor (optional)"}
                  </option>
                  {floorOptions.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Visiting Unit / Resident"
                htmlFor="detail_unit"
                hint={
                  form.floor_id
                    ? "Optional — helps the host find you."
                    : "Select a site, building and floor to choose a unit."
                }
              >
                <Select
                  id="detail_unit"
                  value={form.unit_id}
                  onChange={(event) => selectUnit(event.target.value)}
                  disabled={
                    optionsLoading ||
                    !form.floor_id ||
                    unitsForSelection.length === 0
                  }
                >
                  <option value="">
                    {!form.floor_id
                      ? "Select a floor first"
                      : unitsForSelection.length === 0
                        ? "No units on this floor"
                        : "Select a unit (optional)"}
                  </option>
                  {unitsForSelection.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Host / Resident"
                htmlFor="detail_host"
                hint={
                  form.unit_id
                    ? "Optional — the person you are visiting."
                    : "Select a unit to see the hosts linked to it."
                }
              >
                <Select
                  id="detail_host"
                  value={form.vhost_id}
                  onChange={(event) => update("vhost_id", event.target.value)}
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
                    <option value={form.vhost_id}>{selectedHostName}</option>
                  ) : null}
                  {hosts.map((host) => (
                    <option key={host.id} value={host.id}>
                      {host.full_name}
                      {host.role_label ? ` — ${host.role_label}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Coming From" htmlFor="detail_from" hint="City or company.">
                <TextInput
                  id="detail_from"
                  placeholder="e.g. Mumbai / Acme Pvt Ltd"
                  value={form.coming_from}
                  onChange={(event) => update("coming_from", event.target.value)}
                />
              </Field>
              <Field label="Vehicle Number" htmlFor="detail_vehicle" hint="Optional.">
                <TextInput
                  id="detail_vehicle"
                  placeholder="e.g. MH 01 AB 1234"
                  value={form.vehicle_number}
                  onChange={(event) => update("vehicle_number", event.target.value)}
                />
              </Field>
              <Field label="Expected Date" htmlFor="detail_date" required>
                <TextInput
                  id="detail_date"
                  type="date"
                  required
                  value={form.expected_date}
                  onChange={(event) => update("expected_date", event.target.value)}
                />
              </Field>
              <Field label="Expected Time" htmlFor="detail_time" required>
                <TextInput
                  id="detail_time"
                  type="time"
                  required
                  value={form.expected_time}
                  onChange={(event) => update("expected_time", event.target.value)}
                />
              </Field>

              <div className="flex flex-col-reverse gap-3 pt-2 md:col-span-2 sm:flex-row sm:justify-between">
                <Button type="button" variant="secondary" onClick={startOver}>
                  Change mobile number
                </Button>
                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  {submitting ? "Creating pass…" : "Register & generate pass"}
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        {stage === "pass" && pass ? (
          <div className="flex flex-col gap-5">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-primary to-primary-light px-6 py-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {pass.profile_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pass.profile_image_url}
                        alt={`Profile photo of ${pass.name}`}
                        className="h-12 w-12 rounded-full border-2 border-white/40 object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        Visitor pass issued
                      </p>
                      <h2 className="mt-1 text-xl font-bold">{pass.name}</h2>
                      <p className="mt-0.5 text-sm text-white/80">{pass.pass_code}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-10 w-10 text-white/90" strokeWidth={1.6} />
                </div>
              </div>

              <div className="grid items-center gap-6 p-6 sm:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-xl border border-line bg-white p-3 shadow-sm">
                    {qrImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrImage}
                        alt={`QR pass for ${pass.name}`}
                        className="h-48 w-48"
                      />
                    ) : (
                      <div className="flex h-48 w-48 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted" />
                      </div>
                    )}
                  </div>
                  <p className="text-center text-[11px] text-muted">
                    Show this QR code at the entrance.
                  </p>
                  {qrImage ? (
                    <a
                      href={qrImage}
                      download={`access-pass-${pass.pass_code ?? pass.id}.png`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download pass
                    </a>
                  ) : null}
                </div>

                <div className="space-y-3 text-sm">
                  <DetailRow icon={Phone} label="Mobile" value={pass.contact_no ?? "—"} />
                  <DetailRow icon={ClipboardList} label="Purpose" value={pass.purpose ?? "—"} />
                  <DetailRow
                    icon={MapPin}
                    label="Location"
                    value={
                      pass.location_label ||
                      [pass.site_name, pass.building_name, pass.floor_name, pass.unit_name]
                        .filter(Boolean)
                        .join(" / ") ||
                      "—"
                    }
                  />
                  <DetailRow
                    icon={CalendarDays}
                    label="Valid from"
                    value={formatDateTime(pass.start_pass)}
                  />
                  <DetailRow
                    icon={CalendarDays}
                    label="Valid until"
                    value={formatDateTime(pass.end_pass)}
                  />
                  {pass.host_name ? (
                    <DetailRow icon={UserIcon} label="Host" value={pass.host_name} />
                  ) : null}
                  {pass.vehicle_number ? (
                    <DetailRow icon={Car} label="Vehicle" value={pass.vehicle_number} />
                  ) : null}
                </div>
              </div>

              {pass.pass_url ? (
                <div className="border-t border-line-soft px-6 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Your pass link
                  </p>
                  <p className="mt-1 break-all text-xs font-medium text-accent-strong">
                    {pass.pass_url}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <CopyLinkButton value={pass.pass_url} label="Copy pass link" />
                    <a
                      href={pass.pass_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition hover:bg-canvas-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open pass
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="border-t border-line-soft bg-canvas px-6 py-4">
                <p className="text-xs text-muted">
                  A copy of this pass has been saved as a new visitor record. Keep the QR
                  code ready when you reach the gate.
                </p>
              </div>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/scan/?t=${encodeURIComponent(pass.qr_token ?? "")}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas-2"
              >
                <QrCode className="h-4 w-4" />
                Open scanner
              </Link>
              <Button type="button" variant="navy" onClick={startOver} className="flex-1">
                <RefreshCw className="h-4 w-4" />
                Register another visitor
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <FooterBanner />
    </div>
  );
}

function StepIndicator({ stage }: { stage: Stage }) {
  const steps: { key: Stage; label: string }[] = [
    { key: "phone", label: "Mobile" },
    { key: "details", label: "Details" },
    { key: "pass", label: "Pass" },
  ];
  const activeIndex = steps.findIndex((step) => step.key === stage);

  return (
    <div className="mx-auto mb-6 flex max-w-md items-center gap-2">
      {steps.map((step, index) => {
        const active = index <= activeIndex;
        return (
          <div key={step.key} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active ? "bg-primary text-white" : "bg-canvas-2 text-muted"
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`text-xs font-semibold ${
                active ? "text-ink" : "text-muted"
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? <span className="h-px flex-1 bg-line" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {label}
        </p>
        <p className="break-words text-[13px] font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
