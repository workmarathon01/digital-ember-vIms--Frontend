import type { User } from "./types";

export type Permission = {
  resource: string;
  action: string;
};

/**
 * Super admins bypass every permission check. Sessions created before the
 * permissions payload existed also fail open, so a deploy does not lock
 * everyone out until their next sign-in.
 */
export function can(
  user: User | null,
  resource: string,
  action: string,
): boolean {
  if (!user) return false;
  if (user.role_key === "super_admin") return true;
  if (!Array.isArray(user.permissions)) return true;
  return user.permissions.includes(`${resource}:${action}`);
}

export const routePermissions: Record<string, Permission> = {
  "/properties": { resource: "sites", action: "update" },
  "/visitors": { resource: "visitors", action: "read" },
  "/staffs": { resource: "staffs", action: "read" },
  "/users": { resource: "users", action: "read" },
  "/kiosk": { resource: "visitors", action: "check_in" },
  "/reports": { resource: "visitors", action: "export" },
  "/features": { resource: "features", action: "update" },
};

export const routeFeatures: Record<string, string> = {
  "/properties": "property_management",
  "/visitors": "visitor_management",
  "/staffs": "staff_management",
  "/users": "user_management",
  "/kiosk": "kiosk_mode",
  "/reports": "reports",
  "/features": "feature_access",
};

/**
 * Site features are fail-open for older sessions and when the catalog has not
 * been configured. Once a site-scoped feature list exists, it is authoritative.
 */
export function hasFeatureAccess(
  user: User | null,
  featureKey?: string,
): boolean {
  if (!user) return false;
  if (user.role_key === "super_admin") return true;
  if (!featureKey) return true;
  if (
    user.features_configured !== true ||
    !Array.isArray(user.feature_keys)
  ) {
    return true;
  }
  return user.feature_keys.includes(featureKey);
}
