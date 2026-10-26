"use client";

import Link from "next/link";
import { ArrowRight, MonitorSmartphone, QrCode, UserPlus } from "lucide-react";

export default function KioskPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink">
        Smart Visitor Management System
      </p>
      <h1 className="text-3xl font-bold text-navy">
        <MonitorSmartphone className="mr-2 inline h-7 w-7 text-accent" strokeWidth={1.8} />
        Kiosk Mode
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Visitors can register themselves or scan an existing pass. Both screens are public
        and can be opened directly on the kiosk device.
      </p>

      <div className="mt-8 grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        <Link
          href="/self-register"
          className="group flex flex-col items-start gap-3 rounded-lg border border-line bg-card p-6 text-left transition hover:border-primary/40 hover:shadow-sm"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-info-bg text-info">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">Self Registration</p>
            <p className="mt-1 text-xs text-muted">
              Enter a mobile number, reuse previous details, and generate a QR pass.
            </p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong">
            Open form
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/scan"
          className="group flex flex-col items-start gap-3 rounded-lg border border-line bg-card p-6 text-left transition hover:border-primary/40 hover:shadow-sm"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success-bg text-success">
            <QrCode className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">QR Check-in</p>
            <p className="mt-1 text-xs text-muted">
              Scan a visitor pass to verify it and check the visitor in exactly once.
            </p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-accent-strong">
            Open scanner
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>

      <Link
        href="/visitors"
        className="mt-6 text-xs font-semibold text-accent-strong hover:underline"
      >
        Pre-register a visitor from the staff console →
      </Link>
    </div>
  );
}
