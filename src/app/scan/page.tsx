"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Html5Qrcode } from "html5-qrcode";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Phone,
  QrCode,
  ScanLine,
  TriangleAlert,
  User as UserIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand-logo";
import { FooterBanner } from "@/components/footer-banner";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { checkInPass, verifyPass } from "@/lib/public-api";
import type { PublicPassVerification } from "@/lib/types";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ScanPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInNow, setCheckedInNow] = useState(false);
  const [result, setResult] = useState<PublicPassVerification | null>(null);
  const [verifiedCode, setVerifiedCode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // The camera may already be stopped or the element may have unmounted.
      }
    }
    setScanning(false);
  }, []);

  const processCode = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || processingRef.current) return;

      processingRef.current = true;
      setVerifying(true);
      setError(null);
      setResult(null);
      setCheckedInNow(false);
      setVerifiedCode(code);

      try {
        const data = await verifyPass(code);
        setResult(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "This pass could not be verified. Please try again.",
        );
      } finally {
        setVerifying(false);
        processingRef.current = false;
        await stopScanner();
      }
    },
    [stopScanner],
  );

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    setCameraError(null);

    try {
      const { Html5Qrcode: Scanner } = await import("html5-qrcode");
      const scanner = new Scanner("qr-reader", { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decodedText) => {
          void processCode(decodedText);
        },
        () => {
          // Ignore per-frame decoding misses; the scanner keeps looking.
        },
      );
      setScanning(true);
    } catch {
      scannerRef.current = null;
      setScanning(false);
      setCameraError(
        "The camera could not start. Allow camera access, use HTTPS, or enter the pass code below.",
      );
    }
  }, [processCode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("t") || params.get("token") || params.get("code");

    const timer = window.setTimeout(() => {
      if (token) {
        void processCode(token);
      } else {
        void startScanner();
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      void stopScanner();
    };
    // The scanner should initialise once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCheckIn() {
    if (!verifiedCode) return;
    setCheckingIn(true);
    setError(null);

    try {
      const response = await checkInPass(verifiedCode);
      setResult((current) =>
        current
          ? {
              ...current,
              already_checked_in: response.already_checked_in,
              visitor: response.visitor,
            }
          : current,
      );
      if (!response.already_checked_in) setCheckedInNow(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check in this visitor.");
    } finally {
      setCheckingIn(false);
    }
  }

  function resetScanner() {
    setResult(null);
    setError(null);
    setVerifiedCode("");
    setManualCode("");
    setCameraError(null);
    setCheckedInNow(false);
    // Let the camera panel render before re-initialising the scanner.
    window.setTimeout(() => {
      void startScanner();
    }, 60);
  }

  const alreadyCheckedIn = result?.visitor.checked_in ?? false;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-12 pt-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/login" aria-label="VisiTrack home">
            <LogoMark size="lg" />
          </Link>
          <Link
            href="/self-register"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Self registration
          </Link>
        </header>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">QR Pass Check-in</h1>
          <p className="mt-2 text-sm text-muted">
            Scan the visitor QR code to confirm whether the pass is valid and check the
            visitor in.
          </p>
        </div>

        {error ? (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-[13px] font-medium text-warn">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{error}</p>
              <Link
                href="/self-register"
                className="mt-1 inline-block text-xs font-semibold underline"
              >
                Register this visitor instead
              </Link>
            </div>
          </div>
        ) : null}

        <Card className={`overflow-hidden ${result ? "hidden" : ""}`}>
          <div className="border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-ink">
              <ScanLine className="h-4 w-4 text-accent" />
              Scan a visitor pass
            </h2>
          </div>

          <div className="p-5">
            <div className="relative overflow-hidden rounded-xl border border-line bg-navy">
              <div id="qr-reader" className="min-h-[260px] w-full" />
              {verifying ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy/80 text-white">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm font-medium">Verifying pass…</p>
                </div>
              ) : null}
              {!scanning && !verifying && !cameraError && !error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy text-white">
                  <Camera className="h-8 w-8 text-white/70" />
                  <p className="text-sm font-medium">Camera is starting…</p>
                </div>
              ) : null}
            </div>

            {cameraError ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-bg px-3 py-2 text-xs text-warn">
                <CameraOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {cameraError}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {scanning ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => void stopScanner()}>
                  <CameraOff className="h-3.5 w-3.5" />
                  Stop camera
                </Button>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => void startScanner()}>
                  <Camera className="h-3.5 w-3.5" />
                  Start camera
                </Button>
              )}
              <Link
                href="/self-register"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-accent-strong transition hover:bg-canvas-2"
              >
                <UserIcon className="h-3.5 w-3.5" />
                New visitor
              </Link>
            </div>

            <div className="mt-5 border-t border-line-soft pt-5">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void processCode(manualCode);
                }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="flex-1">
                  <Field label="Pass code" htmlFor="manual_code" hint="e.g. PASS-AB12CD34">
                    <TextInput
                      id="manual_code"
                      value={manualCode}
                      onChange={(event) => setManualCode(event.target.value)}
                      placeholder="PASS-XXXXXXXX"
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <Button type="submit" disabled={!manualCode.trim() || verifying}>
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  Verify
                </Button>
              </form>
            </div>
          </div>
        </Card>

        {result ? (
          <div className="flex flex-col gap-4">
            <Card className="overflow-hidden">
              <div
                className={`px-5 py-4 text-white ${
                  checkedInNow
                    ? "bg-gradient-to-br from-success to-[#146c2e]"
                    : alreadyCheckedIn
                      ? "bg-gradient-to-br from-warn to-[#8a4b00]"
                      : result.visitor.pass_active
                        ? "bg-gradient-to-br from-success to-[#146c2e]"
                        : "bg-gradient-to-br from-warn to-[#8a4b00]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.visitor.profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.visitor.profile_image_url}
                      alt={`Profile photo of ${result.visitor.name}`}
                      className="h-14 w-14 rounded-full border-2 border-white/40 object-cover"
                    />
                  ) : alreadyCheckedIn ? (
                    <BadgeCheck className="h-8 w-8" />
                  ) : (
                    <CheckCircle2 className="h-8 w-8" />
                  )}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/80">
                      {checkedInNow
                        ? "Check-in successful"
                        : result.already_checked_in || alreadyCheckedIn
                          ? "Already checked in"
                          : result.visitor.pass_active
                            ? "Valid pass found"
                            : "Pass not active"}
                    </p>
                    <h2 className="text-xl font-bold">{result.visitor.name}</h2>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <DetailRow
                  icon={Phone}
                  label="Mobile"
                  value={result.visitor.contact_no ?? "—"}
                />
                <DetailRow
                  icon={ClipboardList}
                  label="Purpose"
                  value={result.visitor.purpose ?? "—"}
                />
                <DetailRow
                  icon={QrCode}
                  label="Pass code"
                  value={result.visitor.pass_code ?? "—"}
                />
                <DetailRow
                  icon={CalendarDays}
                  label="Checked in"
                  value={formatDateTime(
                    result.visitor.checked_in_at ?? result.visitor.start_pass,
                  )}
                />
                <DetailRow
                  icon={CalendarDays}
                  label="Valid until"
                  value={formatDateTime(result.visitor.end_pass)}
                />
                <DetailRow
                  icon={ClipboardList}
                  label="Location"
                  value={
                    result.visitor.location_label ||
                    [result.visitor.site_name, result.visitor.unit_name]
                      .filter(Boolean)
                      .join(" / ") ||
                    "—"
                  }
                />
                {result.visitor.host_name ? (
                  <DetailRow
                    icon={UserIcon}
                    label="Host"
                    value={result.visitor.host_name}
                  />
                ) : null}
              </div>

              <div className="border-t border-line-soft px-5 py-4">
                {checkedInNow ? (
                  <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success-bg px-3 py-2.5 text-xs font-medium text-success">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Checked in successfully
                      {result.visitor.checked_in_at
                        ? ` at ${formatDateTime(result.visitor.checked_in_at)}`
                        : ""}
                      . The visitor may proceed to the host.
                    </p>
                  </div>
                ) : alreadyCheckedIn ? (
                  <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success-bg px-3 py-2.5 text-xs font-medium text-success">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      This visitor is already checked in
                      {result.visitor.checked_in_at
                        ? ` since ${formatDateTime(result.visitor.checked_in_at)}`
                        : ""}
                      . No duplicate entry was created.
                    </p>
                  </div>
                ) : result.visitor.pass_active ? (
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={checkingIn}
                    onClick={() => void handleCheckIn()}
                  >
                    {checkingIn ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {checkingIn ? "Checking in…" : "Confirm check-in"}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-bg px-3 py-2.5 text-xs font-medium text-warn">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      This pass has expired or has already been checked out. Issue a new
                      pass for the visitor.
                    </div>
                    <Link
                      href="/self-register"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light"
                    >
                      <UserIcon className="h-4 w-4" />
                      Register a new pass
                    </Link>
                  </div>
                )}
              </div>
            </Card>

            <Button type="button" variant="secondary" onClick={resetScanner}>
              <ScanLine className="h-4 w-4" />
              Scan another pass
            </Button>
          </div>
        ) : null}
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
