import { Building2, type LucideIcon } from "lucide-react";
import type { Permission } from "./permissions";

export type SetupModule = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permission: Permission;
};

/**
 * Modules shown under Setup. Add new configuration modules here and register
 * their routes in `routePermissions` so the app layout can guard them.
 */
export const setupModules: SetupModule[] = [
  {
    href: "/setup/departments",
    label: "Departments",
    description:
      "Create the departments used across users, approvals and reporting.",
    icon: Building2,
    permission: { resource: "departments", action: "read" },
  },
];
