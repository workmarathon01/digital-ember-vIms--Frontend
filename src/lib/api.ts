import type {
  ApiErrorBody,
  DashboardMetrics,
  RoleListResponse,
  Staff,
  StaffListResponse,
  TokenResponse,
  User,
  UserListResponse,
  Visitor,
  VisitorListResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.amplify-automation.com";

const ACCESS_KEY = "visitrack.access_token";
const REFRESH_KEY = "visitrack.refresh_token";
const USER_KEY = "visitrack.user";

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
}

export function clearSession(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(ACCESS_KEY);
  s.removeItem(REFRESH_KEY);
  s.removeItem(USER_KEY);
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
  auth?: boolean;
  retry?: boolean;
};

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(
      `${API_BASE_URL}/session/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
    );

    const payload = (await res.json()) as TokenResponse | ApiErrorBody;
    if (!res.ok || !("access_token" in payload)) return false;
    storeSession(payload);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, retry = true } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, { ...options, retry: false });
    }
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
): Promise<Visitor> {
  return request<Visitor>("/visitors.json", {
    method: "POST",
    body: { visitor: params },
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

export async function fetchUsers(): Promise<UserListResponse> {
  return request<UserListResponse>("/users.json");
}

export async function createUser(
  params: Record<string, unknown>,
): Promise<User> {
  return request<User>("/users.json", {
    method: "POST",
    body: { user: params },
  });
}

export async function fetchRoles(): Promise<RoleListResponse> {
  return request<RoleListResponse>("/roles.json");
}

export { API_BASE_URL };