import { ApiError, API_BASE_URL } from "./api";
import type {
  ApiErrorBody,
  PublicCheckInResponse,
  PublicFormOptions,
  PublicHostList,
  PublicPassVerification,
  PublicVisitorLookup,
  PublicVisitorResponse,
} from "./types";
import { buildVisitorFormData } from "./visitor-form";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  formData?: FormData;
};

/**
 * Unauthenticated API client for the public self-registration and QR check-in
 * screens. It never reads or sends the staff session token.
 */
async function publicRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, formData } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined && !formData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  const text = await res.text();
  let payload: T | ApiErrorBody | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as T | ApiErrorBody;
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const err = payload as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      err?.error?.code ?? "unknown",
      err?.error?.message ?? `Request failed with status ${res.status}`,
    );
  }

  return payload as T;
}

export function lookupVisitor(contactNo: string): Promise<PublicVisitorLookup> {
  return publicRequest<PublicVisitorLookup>(
    `/public/visitors/lookup.json?contact_no=${encodeURIComponent(contactNo)}`,
  );
}

export function registerVisitor(
  params: Record<string, unknown>,
  profileImage?: File | null,
): Promise<PublicVisitorResponse> {
  return publicRequest<PublicVisitorResponse>("/public/visitors.json", {
    method: "POST",
    formData: buildVisitorFormData(params, profileImage),
  });
}

export function verifyPass(code: string): Promise<PublicPassVerification> {
  return publicRequest<PublicPassVerification>(
    `/public/visitors/verify.json?code=${encodeURIComponent(code)}`,
  );
}

export function checkInPass(code: string): Promise<PublicCheckInResponse> {
  return publicRequest<PublicCheckInResponse>("/public/visitors/check_in.json", {
    method: "POST",
    body: { code },
  });
}

export function fetchPublicFormOptions(): Promise<PublicFormOptions> {
  return publicRequest<PublicFormOptions>("/public/form_options.json");
}

export function fetchHosts(unitId: number): Promise<PublicHostList> {
  return publicRequest<PublicHostList>(
    `/public/hosts.json?unit_id=${encodeURIComponent(unitId)}`,
  );
}
