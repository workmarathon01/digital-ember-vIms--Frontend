type BadgeTone = "success" | "info" | "warning";

const tones: Record<BadgeTone, string> = {
  success: "bg-success-bg text-success",
  info: "bg-info-bg text-info",
  warning: "bg-warn-bg text-warn",
};

export function StatusBadge({ tone, children }: { tone: BadgeTone; children: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}