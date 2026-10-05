import { ArrowRight } from "lucide-react";

export function KioskPanel() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light p-8 text-center shadow-sm">
      <div className="flex flex-col items-center gap-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          Visitor Sign-in
        </p>
        <h3 className="max-w-xs text-xl font-bold text-white">
          Welcome to VisiTrack. Have an appointment?
        </h3>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-3 rounded-lg bg-white px-8 py-4 text-sm font-semibold text-primary transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          Check-in Here
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <p className="text-xs text-white/60">
          Please have your ID and host details ready.
        </p>
      </div>
    </div>
  );
}