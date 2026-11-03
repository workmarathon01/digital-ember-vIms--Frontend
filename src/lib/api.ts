import type {
  ApiErrorBody,
  Building,
  BuildingListResponse,
  DashboardMetrics,
  Department,
  DepartmentListResponse,
  Feature,
  FeatureListResponse,
  FeatureOverrideState,
  FeatureTemplate,
  Floor,
  FloorListResponse,
  LocationDirectory,
  PaginationMeta,
  RoleListResponse,
  Site,
  SiteFeatureAccess,
  SiteListResponse,
  Staff,
  StaffListResponse,
  TokenResponse,
  Unit,
  UnitListResponse,
  User,
  UserFeatureAccess,
  UserListResponse,
  UserSite,
  UserSiteListResponse,
  Visitor,
  VisitorListResponse,
} from "./types";
import { buildVisitorFormData } from "./visitor-form";

const API_BASE_URL =
 process.env.NEXT_PUBLIC_API_URL ?? "https://api.amplify-automation.com";

const ACCESS_KEY = "visitrack.access_token";
const REFRESH_KEY = "visitrack.refresh_token";
const USER_KEY = "visitrack.user";
const SESSION_EXPIRED_KEY = "visitrack.session_expired";

export const SESSION_EXPIRED_EVENT = "visitrack:session-expired";

let refreshPromise: Promise<boolean> | null = null;
let sessionExpiryNotified = false;

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function getAccessToken(): string | null {
  return storage()?.getItem(ACCESS_KEY) ?? null;
}

export function getRefreshToken(): string | null {
  return storage()?.getItem(REFRESH_KEY) ?? null;
}

export function getStoredUser(): User | null {
  const raw = storage()?.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function storeSession(tokens: TokenResponse): void {
  const s = storage();
  if (!s) return;
  s.setItem(ACCESS_KEY, tokens.access_token);
  s.setItem(REFRESH_KEY, tokens.refresh_token);
  s.setItem(USER_KEY, JSON.stringify(tokens.user));
  sessionExpiryNotified = false;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  }
}

export function clearSession(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(ACCESS_KEY);
  s.removeItem(REFRESH_KEY);
  s.removeItem(USER_KEY);
}

export function consumeSessionExpiredNotice(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const expired = window.sessionStorage.getItem(SESSION_EXPIRED_KEY) === "1";
    if (expired) window.sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return expired;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  auth?: boolean;
  retry?: boolean;
};

function notifySessionExpired(): void {
  clearSession();

  if (sessionExpiryNotified) return;
  sessionExpiryNotified = true;

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

async function refreshAccessToken(): Promise<boolean> {
  // Several page loads can request data at the same time. Share one refresh
  // request instead of letting every failed call try to refresh separately.
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      notifySessionExpired();
      return false;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/session/refresh.json`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const text = await res.text();
      let payload: TokenResponse | ApiErrorBody | null = null;
      if (text) {
        try {
          payload = JSON.parse(text) as TokenResponse | ApiErrorBody;
        } catch {
          payload = null;
        }
      }

      if (res.status === 401 || !payload || !("access_token" in payload)) {
        // Only an authentication rejection means the session is unrecoverable.
        // A server or network failure should not sign the user out.
        if (res.status === 401) notifySessionExpired();
        return false;
      }

      storeSession(payload);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function refreshSession(): Promise<boolean> {
  return refreshAccessToken();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    formData,
    auth = true,
    retry = true,
  } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined && !formData) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (res.status === 401 && auth && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...options, retry: false });
    }
  } else if (res.status === 401 && auth) {
    // The retried request still rejected the new token, so the session cannot
    // be recovered. Clear it and let the auth provider redirect to sign-in.
    notifySessionExpired();
  }

  const text = await res.text();
  const payload = text ? (JSON.parse(text) as T | ApiErrorBody) : null;

  if (!res.ok) {
    const err = payload as ApiErrorBody;
    throw new ApiError(
      res.status,
      err?.error?.code ?? "unknown",
      err?.error?.message ?? `Request failed with status ${res.status}`,
    );
  }

  return payload as T;
}

export async function login(email: string, password: string): Promise<User> {
  const tokens = await request<TokenResponse>("/session.json", {
    method: "POST",
    body: { email, password },
    auth: false,
    retry: false,
  });
  storeSession(tokens);
  return tokens.user;
}

export async function logout(): Promise<void> {
  try {
    await request("/session.json", { method: "DELETE", auth: true });
  } catch {
    // Local session is cleared regardless of server response.
  } finally {
    clearSession();
  }
}

export async function fetchDashboard(): Promise<DashboardMetrics> {
  return request<DashboardMetrics>("/");
}

export async function fetchVisitors(): Promise<VisitorListResponse> {
  return request<VisitorListResponse>("/visitors.json");
}

export async function createVisitor(
  params: Record<string, unknown>,
  profileImage?: File | null,
): Promise<Visitor> {
  // `expected_duration` is a form-only hint; it is not a persisted column.
  const payload = { ...params };
  delete payload.expected_duration;

  if (profileImage) {
    return request<Visitor>("/visitors.json", {
      method: "POST",
      formData: buildVisitorFormData(payload, profileImage),
    });
  }

  return request<Visitor>("/visitors.json", {
    method: "POST",
    body: { visitor: payload },
  });
}

export async function fetchStaffs(): Promise<StaffListResponse> {
  return request<StaffListResponse>("/staffs.json");
}

export async function createStaff(
  params: Record<string, unknown>,
): Promise<Staff> {
  return request<Staff>("/staffs.json", {
    method: "POST",
    body: { staff: params },
  });
}

export async function fetchUsers(page = 1): Promise<UserListResponse> {
  return request<UserListResponse>(`/users.json?page=${page}`);
}

/**
 * Fetch every user across paginated pages. Feature Access needs the full list so
 * an administrator can review access for any user, not just the first page.
 */
export async function fetchAllUsers(): Promise<User[]> {
  const users: User[] = [];
  let page = 1;
  let pages = 1;

  do {
    const response = await fetchUsers(page);
    users.push(...response.data);
    pages = response.meta.pages;
    page += 1;
  } while (page <= pages && page <= 100);

  return users;
}

export async function fetchPendingRegistrations(
  page = 1,
): Promise<UserListResponse> {
  return request<UserListResponse>(
    `/users/pending_registrations.json?page=${page}`,
  );
}

export async function approveUserRegistration(
  id: number,
  note?: string,
): Promise<User> {
  return request<User>(`/users/${id}/approve_registration.json`, {
    method: "POST",
    body: note ? { note } : {},
  });
}

export async function rejectUserRegistration(
  id: number,
  note?: string,
): Promise<User> {
  return request<User>(`/users/${id}/reject_registration.json`, {
    method: "POST",
    body: note ? { note } : {},
  });
}

function userFormData(
  params: Record<string, unknown>,
  profileImage?: File | null,
): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    formData.append(`user[${key}]`, String(value));
  }

  if (profileImage) formData.append("user[profile_image]", profileImage);

  return formData;
}

export async function createUser(
  params: Record<string, unknown>,
  profileImage?: File | null,
): Promise<User> {
  if (profileImage) {
    return request<User>("/users.json", {
      method: "POST",
      formData: userFormData(params, profileImage),
    });
  }

  return request<User>("/users.json", {
    method: "POST",
    body: { user: params },
  });
}

export async function updateUser(
  id: number,
  params: Record<string, unknown>,
  profileImage?: File | null,
): Promise<User> {
  if (profileImage) {
    return request<User>(`/users/${id}.json`, {
      method: "PATCH",
      formData: userFormData(params, profileImage),
    });
  }

  return request<User>(`/users/${id}.json`, {
    method: "PATCH",
    body: { user: params },
  });
}

export async function fetchRoles(): Promise<RoleListResponse> {
  return request<RoleListResponse>("/roles.json");
}

export async function fetchSites(): Promise<SiteListResponse> {
  return request<SiteListResponse>("/sites.json");
}

export async function createSite(params: Record<string, unknown>): Promise<Site> {
  return request<Site>("/sites.json", {
    method: "POST",
    body: { site: params },
  });
}

export async function updateSite(
  id: number,
  params: Record<string, unknown>,
): Promise<Site> {
  return request<Site>(`/sites/${id}.json`, {
    method: "PATCH",
    body: { site: params },
  });
}

export async function deleteSite(id: number): Promise<void> {
  await request(`/sites/${id}.json`, { method: "DELETE" });
}

export async function fetchBuildings(): Promise<BuildingListResponse> {
  return request<BuildingListResponse>("/buildings.json");
}

export async function createBuilding(
  params: Record<string, unknown>,
): Promise<Building> {
  return request<Building>("/buildings.json", {
    method: "POST",
    body: { building: params },
  });
}

export async function deleteBuilding(id: number): Promise<void> {
  await request(`/buildings/${id}.json`, { method: "DELETE" });
}

export async function fetchFloors(): Promise<FloorListResponse> {
  return request<FloorListResponse>("/floors.json");
}

export async function createFloor(
  params: Record<string, unknown>,
): Promise<Floor> {
  return request<Floor>("/floors.json", {
    method: "POST",
    body: { floor: params },
  });
}

export async function deleteFloor(id: number): Promise<void> {
  await request(`/floors/${id}.json`, { method: "DELETE" });
}

export async function fetchUnits(): Promise<UnitListResponse> {
  return request<UnitListResponse>("/units.json");
}

type PaginatedPayload<T> = {
  data: T[];
  meta: PaginationMeta;
};

/**
 * Reads every page of a paginated JSON endpoint. Location dropdowns must see
 * the whole tree, not just the first 25 records.
 */
async function fetchAllPages<T>(path: string): Promise<T[]> {
  const first = await request<PaginatedPayload<T>>(path);
  const records = [...first.data];
  const pages = first.meta?.pages ?? 1;

  if (pages > 1) {
    const remaining = await Promise.all(
      Array.from({ length: pages - 1 }, (_, index) =>
        request<PaginatedPayload<T>>(`${path}?page=${index + 2}`),
      ),
    );
    for (const page of remaining) records.push(...page.data);
  }

  return records;
}

async function fetchAllPagesSafe<T>(path: string): Promise<T[]> {
  try {
    return await fetchAllPages<T>(path);
  } catch {
    // A user may be allowed to build a visitor or user form without being
    // allowed to browse every part of the property tree. Missing options
    // should not break the whole screen.
    return [];
  }
}

/**
 * Loads the complete location hierarchy for dependent dropdowns. Each branch
 * is resolved independently so a missing permission only empties that level.
 */
export async function fetchLocationDirectory(): Promise<LocationDirectory> {
  const [sites, buildings, floors, units] = await Promise.all([
    fetchAllPagesSafe<Site>("/sites.json"),
    fetchAllPagesSafe<Building>("/buildings.json"),
    fetchAllPagesSafe<Floor>("/floors.json"),
    fetchAllPagesSafe<Unit>("/units.json"),
  ]);

  return { sites, buildings, floors, units };
}

export async function createUnit(params: Record<string, unknown>): Promise<Unit> {
  return request<Unit>("/units.json", {
    method: "POST",
    body: { unit: params },
  });
}

export async function deleteUnit(id: number): Promise<void> {
  await request(`/units/${id}.json`, { method: "DELETE" });
}

export async function fetchUserSites(): Promise<UserSiteListResponse> {
  return request<UserSiteListResponse>("/user_sites.json");
}

export async function createUserSite(
  params: Record<string, unknown>,
): Promise<UserSite> {
  return request<UserSite>("/user_sites.json", {
    method: "POST",
    body: { user_site: params },
  });
}

export async function deleteUserSite(id: number): Promise<void> {
  await request(`/user_sites/${id}.json`, { method: "DELETE" });
}

export async function makePrimaryUserSite(id: number): Promise<UserSite> {
  return request<UserSite>(`/user_sites/${id}/make_primary.json`, {
    method: "POST",
  });
}

export async function fetchDepartments(): Promise<DepartmentListResponse> {
  return request<DepartmentListResponse>("/departments.json");
}

export async function createDepartment(
  params: Record<string, unknown>,
): Promise<Department> {
  return request<Department>("/departments.json", {
    method: "POST",
    body: { department: params },
  });
}

export async function updateDepartment(
  id: number,
  params: Record<string, unknown>,
): Promise<Department> {
  return request<Department>(`/departments/${id}.json`, {
    method: "PATCH",
    body: { department: params },
  });
}

export async function deleteDepartment(id: number): Promise<void> {
  await request(`/departments/${id}.json`, { method: "DELETE" });
}

export async function fetchFeatures(): Promise<FeatureListResponse> {
  return request<FeatureListResponse>("/features.json");
}

export async function fetchFeatureTemplates(): Promise<FeatureTemplate[]> {
  return request<FeatureTemplate[]>("/features/templates.json");
}

export async function createFeature(
  params: Record<string, unknown>,
): Promise<Feature> {
  return request<Feature>("/features.json", {
    method: "POST",
    body: { feature: params },
  });
}

export async function updateFeature(
  id: number,
  params: Record<string, unknown>,
): Promise<Feature> {
  return request<Feature>(`/features/${id}.json`, {
    method: "PATCH",
    body: { feature: params },
  });
}

export async function deleteFeature(id: number): Promise<void> {
  await request(`/features/${id}.json`, { method: "DELETE" });
}

export async function fetchSiteFeatures(
  siteId: number,
): Promise<SiteFeatureAccess> {
  return request<SiteFeatureAccess>(`/sites/${siteId}/features.json`);
}

export async function updateSiteFeatures(
  siteId: number,
  featureIds: number[],
): Promise<SiteFeatureAccess> {
  return request<SiteFeatureAccess>(`/sites/${siteId}/features.json`, {
    method: "PATCH",
    body: { feature_ids: featureIds },
  });
}

export async function fetchUserFeatures(
  userId: number,
  siteId?: number,
): Promise<UserFeatureAccess> {
  const query = siteId ? `?site_id=${siteId}` : "";
  return request<UserFeatureAccess>(`/users/${userId}/features.json${query}`);
}

export async function updateUserFeatures(
  userId: number,
  siteId: number,
  overrides: Record<number, FeatureOverrideState>,
): Promise<UserFeatureAccess> {
  return request<UserFeatureAccess>(`/users/${userId}/features.json`, {
    method: "PATCH",
    body: { site_id: siteId, overrides },
  });
}

export { API_BASE_URL };