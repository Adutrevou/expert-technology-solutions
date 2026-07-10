import { INTERGRAI_CLIENT_SLUG } from "@/lib/leads-api";

export type AppRole =
  | "client_owner"
  | "manager"
  | "sales_user"
  | "viewer"
  | "intergrai_admin"
  | "system_agent";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  clientSlug: string;
  mustChangePassword: boolean;
}

interface LoginResponse {
  token: string;
  user: AuthUser | null;
}

interface BasicAuthResponse {
  ok: boolean;
  message?: string;
}

const AUTH_API_BASE_URL = resolveAuthApiBaseUrl(String(import.meta.env.VITE_LEADS_API_BASE_URL || "").trim());

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await postJson("/auth/login", { email, password });
  return {
    token: extractToken(response),
    user: tryNormalizeAuthUser(response),
  };
}

export async function getMe(token: string): Promise<AuthUser> {
  const response = await requestJson("/auth/me", {
    method: "GET",
    headers: authHeaders(token),
  });

  return normalizeAuthUser(response);
}

export async function logout(token: string): Promise<boolean> {
  const url = buildAuthUrl("/auth/logout");
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: authHeaders(token),
    });
  } catch {
    return false;
  }

  if (response.status === 404 || response.status === 405) {
    return false;
  }

  return response.ok;
}

export async function requestPasswordReset(email: string): Promise<BasicAuthResponse> {
  await postJson("/auth/password-reset/request", { email });
  return {
    ok: true,
    message: "If that email is active for this portal, a password reset link has been prepared.",
  };
}

export async function resetPassword(token: string, password: string): Promise<BasicAuthResponse> {
  await postJson("/auth/password-reset/reset", { token, password });
  return {
    ok: true,
    message: "Your password has been reset. You can now sign in.",
  };
}

export async function changePassword(token: string, currentPassword: string, newPassword: string): Promise<BasicAuthResponse> {
  await requestJson("/auth/change-password", {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  return {
    ok: true,
    message: "Password updated successfully.",
  };
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function postJson(path: string, body: Record<string, unknown>) {
  return requestJson(path, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function requestJson(path: string, init: RequestInit) {
  const url = buildAuthUrl(path);
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(`Authentication service is unavailable. ${formatNetworkError(error)}`);
  }

  const text = await safeReadText(response);
  const payload = parseJson(text);

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload) || `Authentication failed (${response.status}).`);
  }

  return payload;
}

function safeReadText(response: Response) {
  return response.text().catch(() => "");
}

function parseJson(text: string): unknown {
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Authentication service returned an invalid response.");
  }
}

function extractErrorMessage(payload: unknown): string | null {
  const record = asRecord(payload);
  return (
    pickString(record, ["error", "message"]) ||
    pickString(asRecord(record.errors), ["error", "message"]) ||
    null
  );
}

function extractToken(payload: unknown): string {
  const record = asRecord(payload);
  const nested = [asRecord(record.data), asRecord(record.session), asRecord(record.auth)];

  for (const candidate of [record, ...nested]) {
    const token = pickString(candidate, ["token", "access_token", "accessToken", "jwt"]);
    if (token) return token;
  }

  throw new Error("Authentication service did not return a session token.");
}

function tryNormalizeAuthUser(payload: unknown): AuthUser | null {
  try {
    return normalizeAuthUser(payload);
  } catch {
    return null;
  }
}

function normalizeAuthUser(payload: unknown): AuthUser {
  const record = asRecord(payload);
  const nestedUser = pickUserRecord(record);
  const email = pickString(nestedUser, ["email"]) || pickString(record, ["email"]);
  const roleValue = pickString(nestedUser, ["role"]) || pickString(record, ["role"]);
  const role = normalizeRole(roleValue);

  if (!email) {
    throw new Error("Authenticated user email was missing from the auth response.");
  }

  const scopedSlug =
    pickString(nestedUser, ["client_slug", "clientSlug", "tenant_slug", "tenantSlug", "workspace_slug", "workspaceSlug"]) ||
    pickString(asRecord(nestedUser.client), ["slug", "client_slug", "clientSlug"]) ||
    pickString(asRecord(record.client), ["slug", "client_slug", "clientSlug"]) ||
    pickString(asRecord(nestedUser.organization), ["slug"]) ||
    pickString(asRecord(record.organization), ["slug"]);

  if (scopedSlug && scopedSlug !== INTERGRAI_CLIENT_SLUG) {
    throw new Error("This account is not assigned to the Expert Technology Solutions portal.");
  }

  return {
    id: pickString(nestedUser, ["id", "_id", "user_id", "userId"]) || email,
    name:
      pickString(nestedUser, ["name", "full_name", "fullName"]) ||
      buildDisplayName(email),
    email,
    role,
    clientSlug: INTERGRAI_CLIENT_SLUG,
    mustChangePassword: pickBoolean(nestedUser, ["must_change_password", "mustChangePassword"]) ?? false,
  };
}

function pickUserRecord(record: Record<string, unknown>) {
  const direct = recordLooksLikeUser(record) ? record : null;
  const nestedCandidates = [
    asRecord(record.user),
    asRecord(record.me),
    asRecord(record.account),
    asRecord(record.profile),
    asRecord(asRecord(record.data).user),
    asRecord(record.data),
  ];

  for (const candidate of [direct, ...nestedCandidates]) {
    if (candidate && recordLooksLikeUser(candidate)) {
      return candidate;
    }
  }

  return record;
}

function recordLooksLikeUser(record: Record<string, unknown>) {
  return Boolean(
    pickString(record, ["email"]) ||
      pickString(record, ["role"]) ||
      pickString(record, ["name", "full_name", "fullName"]),
  );
}

function normalizeRole(value?: string): AppRole {
  switch (value) {
    case "client_owner":
    case "manager":
    case "sales_user":
    case "viewer":
    case "intergrai_admin":
    case "system_agent":
      return value;
    default:
      throw new Error("This account does not have a supported portal role.");
  }
}

function buildDisplayName(email: string) {
  const localPart = email.split("@")[0] || "User";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function pickBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function resolveAuthApiBaseUrl(value: string) {
  const trimmed = value.replace(/\/+$/, "");
  // No override → use same-origin proxy to sidestep CORS in preview/published.
  if (!trimmed) return "/api";
  if (trimmed.startsWith("/")) return "/api";

  try {
    const url = new URL(trimmed);
    return url.toString().replace(/\/+$/, "");
  } catch {
    return "/api";
  }
}

function buildAuthUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${AUTH_API_BASE_URL}${normalizedPath}`;
}

function formatNetworkError(error: unknown) {
  return error instanceof Error && error.message ? error.message : "Please try again.";
}
