import {
  BadgeCheck,
  BarChart3,
  Bell,
  Car,
  Camera,
  ClipboardList,
  QrCode,
  ScanLine,
} from "lucide-react";

const features = [
  { label: "Pre-registration", icon: ClipboardList },
  { label: "QR Check-in", icon: QrCode },
  { label: "ID Verification", icon: ScanLine },
  { label: "Photo Capture", icon: Camera },
  { label: "Host Notification", icon: Bell },
  { label: "Visitor Badges", icon: BadgeCheck },
  { label: "Vehicle Management", icon: Car },
  { label: "Reports & Analytics", icon: BarChart3 },
];

export function FeatureGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {features.map(({ label, icon: Icon }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-4"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-canvas-2">
            <Icon className="h-5 w-5 text-accent" strokeWidth={1.7} />
          </span>
          <span className="text-center text-[11px] font-medium leading-tight text-ink">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}