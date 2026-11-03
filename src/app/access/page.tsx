"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  Loader2,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  TriangleAlert,
  User as UserIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand-logo";
import { FooterBanner } from "@/components/footer-banner";
import { Card } from "@/components/ui";
import { fetchVisitorPass } from "@/lib/public-api";
import type { PublicVisitor } from "@/lib/types";

type PageState = "loading" | "ready" | "error";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusFor(visitor: PublicVisitor) {
  if (visitor.checked_in) {
    return { label: "Checked in", tone: "success" as const };
  }
  if (visitor.visitor_in_out === "OUT") {
    return { label: "Checked out", tone: "warning" as const };
  }
  if (visitor.pass_active) {
    return { label: "Valid pass", tone: "success" as const };
  }
  return { label: "Expired", tone: "warning" as const };
}

export default function VisitorPassPage() {
  const [state, setState] = useState<PageState>("loading");
  const [visitor, setVisitor] = useState<PublicVisitor | null>(null);
  const [token, setToken] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const passToken = params.get("t") || params.get("token") || "";
    let cancelled = false;

    // Read the token from the URL inside a timer so the initial render is not
    // tied to browser globals and React can batch the first state update.
    const timer = window.setTimeout(() => {
      setToken(passToken);

      if (!passToken) {
        setError(
          "This pass link is missing its secure token. Ask the host or reception to send it again.",
        );
        setState("error");
        return;
      }

      void fetchVisitorPass(passToken)
        .then((response) => {
          if (cancelled) return;
          setVisitor(response.visitor);
          setState("ready");
        })
        .catch((err) => {
          if (cancelled) return;
          setError(
            err instanceof Error
              ? err.message
              : "We could not load this visitor pass. The link may have expired.",
          );
          setState("error");
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const qrPayload = useMemo(() => {
    if (!token) return "";
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return origin ? `${origin}/scan/?t=${encodeURIComponent(token)}` : token;
  }, [token]);

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

  const status = visitor ? statusFor(visitor) : null;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-12 pt-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/login" aria-label="VisiTrack home">
            <LogoMark size="lg" />
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <ShieldCheck className="h-4 w-4 text-accent" />
            Secure visitor pass
          </div>
        </header>

        {state === "loading" ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
            <p className="text-sm font-medium text-ink">Loading your visitor pass…</p>
            <p className="text-xs text-muted">
              Verifying the secure link and fetching your details.
            </p>
          </Card>
        ) : null}

        {state === "error" ? (
          <Card className="p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-bg text-warn">
                <TriangleAlert className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-lg font-bold text-navy">Pass link unavailable</h1>
                <p className="mt-1 text-sm text-muted">{error}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/self-register"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light"
              >
                <UserIcon className="h-4 w-4" />
                Register a new visitor
              </Link>
              <Link
                href="/scan"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas-2"
              >
                <QrCode className="h-4 w-4" />
                Open scanner
              </Link>
            </div>
          </Card>
        ) : null}

        {state === "ready" && visitor && status ? (
          <div className="flex flex-col gap-5">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-primary to-primary-light px-6 py-5 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {visitor.profile_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={visitor.profile_image_url}
                        alt={`Profile photo of ${visitor.name}`}
                        className="h-14 w-14 rounded-full border-2 border-white/40 object-cover"
                      />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/10">
                        <UserIcon className="h-6 w-6 text-white/80" />
                      </span>
                    )}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        Visitor pass
                      </p>
                      <h1 className="mt-1 text-2xl font-bold">{visitor.name}</h1>
                      <p className="mt-0.5 font-mono text-sm text-white/80">
                        {visitor.pass_code ?? "—"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                      status.tone === "success"
                        ? "bg-success text-white"
                        : "bg-warn text-white"
                    }`}
                  >
                    {status.tone === "success" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Clock3 className="h-3.5 w-3.5" />
                    )}
                    {status.label}
                  </span>
                </div>
              </div>

              <div className="grid items-center gap-6 p-6 sm:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-xl border border-line bg-white p-3 shadow-sm">
                    {qrImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrImage}
                        alt={`QR pass for ${visitor.name}`}
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
                      download={`access-pass-${visitor.pass_code ?? visitor.id}.png`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download QR pass
                    </a>
                  ) : null}
                </div>

                <div className="space-y-3.5 text-sm">
                  <DetailRow
                    icon={Phone}
                    label="Mobile"
                    value={visitor.contact_no ?? "—"}
                  />
                  <DetailRow
                    icon={ClipboardList}
                    label="Purpose"
                    value={visitor.purpose ?? "—"}
                  />
                  {visitor.host_name ? (
                    <DetailRow
                      icon={UserIcon}
                      label="Host"
                      value={visitor.host_name}
                    />
                  ) : null}
                  <DetailRow
                    icon={MapPin}
                    label="Location"
                    value={
                      visitor.location_label ||
                      [
                        visitor.site_name,
                        visitor.building_name,
                        visitor.floor_name,
                        visitor.unit_name,
                      ]
                        .filter(Boolean)
                        .join(" / ") ||
                      "—"
                    }
                  />
                  <DetailRow
                    icon={CalendarDays}
                    label="Valid from"
                    value={formatDateTime(visitor.start_pass)}
                  />
                  <DetailRow
                    icon={CalendarDays}
                    label="Valid till"
                    value={formatDateTime(visitor.end_pass)}
                  />
                  <DetailRow
                    icon={Clock3}
                    label="Pass created"
                    value={formatDateTime(visitor.created_at)}
                  />
                  {visitor.checked_in_at ? (
                    <DetailRow
                      icon={BadgeCheck}
                      label="Checked in"
                      value={formatDateTime(visitor.checked_in_at)}
                    />
                  ) : null}
                  {visitor.visit_type ? (
                    <DetailRow
                      icon={ClipboardList}
                      label="Visit type"
                      value={visitor.visit_type}
                    />
                  ) : null}
                  {visitor.coming_from ? (
                    <DetailRow
                      icon={MapPin}
                      label="Coming from"
                      value={visitor.coming_from}
                    />
                  ) : null}
                  {visitor.vehicle_number ? (
                    <DetailRow
                      icon={Car}
                      label="Vehicle"
                      value={visitor.vehicle_number}
                    />
                  ) : null}
                </div>
              </div>

              {/* <div className="border-t border-line-soft bg-canvas px-6 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Your pass link
                </p>
                <p className="mt-1 break-all text-xs font-medium text-accent-strong">
                  {shareUrl}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <CopyLinkButton value={shareUrl} label="Copy pass link" />
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition hover:bg-canvas-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open pass
                  </a>
                </div>
                <p className="mt-3 text-[11px] text-muted">
                  Keep this link private. It opens your pass and QR code without a
                  password.
                </p>
              </div> */}
            </Card>

            {/* <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/scan/?t=${encodeURIComponent(token)}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas-2"
              >
                <QrCode className="h-4 w-4" />
                Open scanner
              </Link>
              <Link
                href="/self-register"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light"
              >
                <RefreshCw className="h-4 w-4" />
                Register another visitor
              </Link>
            </div> */}
          </div>
        ) : null}

        {/* <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div> */}
      </div>

      <FooterBanner />
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
