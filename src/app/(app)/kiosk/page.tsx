"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MonitorSmartphone, QrCode } from "lucide-react";

export default function KioskPage() {
  const [checkedIn, setCheckedIn] = useState(false);

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
        Tap the button below to issue or print your visitor pass. Identity is verified at the desk.
      </p>

      <div className="mt-8 w-full max-w-md rounded-lg border border-line bg-card p-8">
        {checkedIn ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-bg">
              <QrCode className="h-7 w-7 text-success" strokeWidth={1.8} />
            </div>
            <p className="text-sm font-semibold text-ink">Pass generated</p>
            <p className="text-xs text-muted">
              Please proceed to the desk to collect your badge.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCheckedIn(true)}
            className="inline-flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-8 py-4 text-base font-semibold text-white transition hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            Check-in Here
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <Link
        href="/visitors"
        className="mt-6 text-xs font-semibold text-accent-strong hover:underline"
      >
        Pre-register instead →
      </Link>
    </div>
  );
}