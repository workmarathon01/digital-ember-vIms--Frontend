"use client";

import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  Settings,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "./brand-logo";
import { useAuth } from "@/lib/auth-context";
import {
  can,
  hasFeatureAccess,
  isSuperAdmin,
  type Permission,
} from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  featureKey?: string;
  permission?: Permission;
  superAdminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/properties",
    label: "Sites & Properties",
    icon: Building2,
    featureKey: "property_management",
    permission: { resource: "sites", action: "update" },
  },
  {
    href: "/visitors",
    label: "Pre-registration",
    icon: ClipboardList,
    featureKey: "visitor_management",
    permission: { resource: "visitors", action: "read" },
  },
  {
    href: "/staffs",
    label: "Staff Directory",
    icon: Users,
    featureKey: "staff_management",
    permission: { resource: "staffs", action: "read" },
  },
  {
    href: "/users",
    label: "Users & Roles",
    icon: UserCog,
    featureKey: "user_management",
    permission: { resource: "users", action: "read" },
  },
  {
    href: "/kiosk",
    label: "Kiosk Check-in",
    icon: MonitorSmartphone,
    featureKey: "kiosk_mode",
    permission: { resource: "visitors", action: "check_in" },
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    featureKey: "reports",
    permission: { resource: "visitors", action: "export" },
  },
  {
    href: "/features",
    label: "Feature Access",
    icon: Sparkles,
    superAdminOnly: true,
    permission: { resource: "features", action: "update" },
  },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const visibleNavItems = navItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin(user)) return false;

    if (
      item.permission &&
      !can(user, item.permission.resource, item.permission.action)
    ) {
      return false;
    }

    return hasFeatureAccess(user, item.featureKey);
  });

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col justify-between bg-navy text-white">
      <div className="shrink-0 border-b border-white/10 px-6 py-5">
        <LogoMark variant="dark" />
      </div>

      <nav className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-4 py-4">
        <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-muted">
          Main Menu
        </div>
        <div className="space-y-1">
          {visibleNavItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-md px-3.5 py-2.5 text-[13px] font-medium transition ${
                  active
                    ? "bg-accent-strong text-white"
                    : "text-slate-muted hover:bg-hover-nav hover:text-white"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-white/10 bg-navy px-4 py-4">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          {user?.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profile_image_url}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full border border-white/20 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-white">
              {user?.full_name?.slice(0, 2).toUpperCase() ?? "GT"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">
              {user?.full_name ?? "Guest"}
            </p>
            <p className="truncate text-xs text-slate-muted">
              {user?.email ?? "not signed in"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void logout().then(() => router.push("/login"));
          }}
          className="mt-2 flex w-full items-center gap-3 rounded-md px-3.5 py-2.5 text-[13px] font-medium text-slate-muted transition hover:bg-hover-nav hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}