interface LogoProps {
  size?: "sm" | "md" | "lg";
  /** "light" = on a light background (login page, headers); "dark" = on a dark background (sidebar) */
  variant?: "light" | "dark";
}

export function VisiTrackLogo({ size = "md", variant = "light" }: LogoProps) {
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const pill = size === "lg" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  const visiColor = variant === "dark" ? "text-white" : "text-navy";
  const trackColor = variant === "dark" ? "text-accent" : "text-primary";
  const pillBg = variant === "dark" ? "bg-accent-strong/25" : "bg-navy";

  return (
    <div className={`inline-flex items-baseline font-bold tracking-tight ${text}`}>
      <span className={visiColor}>Visi</span>
      <span className={trackColor}>Track</span>
      <span
        className={`ml-1.5 inline-flex items-center rounded font-semibold text-white ${pillBg} ${pill}`}
      >
        VMS
      </span>
    </div>
  );
}

export const LogoMark = VisiTrackLogo;