import { CheckCircle2, ShieldCheck } from "lucide-react";

const items: { label: string; icon: "check" | "shield" }[] = [
  { label: "SECURE", icon: "shield" },
  { label: "EFFICIENT", icon: "check" },
  { label: "INTEGRATED", icon: "check" },
  { label: "INTELLIGENT", icon: "shield" },
];

export function FooterBanner() {
  return (
    <div className="mt-auto border-t border-line bg-card py-5">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
        <span>
          <span className="font-extrabold text-navy">AMPLIFY</span>{" "}
          <span className="font-extrabold text-primary">AUTOMATION</span>
        </span>
        <span className="h-4 w-px bg-line" aria-hidden />
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            {item.icon === "shield" ? (
              <ShieldCheck
                className="h-3.5 w-3.5 text-accent"
                strokeWidth={2.2}
              />
            ) : (
              <CheckCircle2
                className="h-3.5 w-3.5 text-accent"
                strokeWidth={2.2}
              />
            )}
            <span>{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}