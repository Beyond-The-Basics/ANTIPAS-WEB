// Thin fetch wrapper around the Kickoff API.
//
// Auth is a JWT bearer token from `POST /auth/login` or `POST /auth/signup`, held in localStorage
// and attached to every request. This is the single auth seam: nothing else in the app knows how a
// request is authenticated.
//
// The backend also still accepts the pre-auth `X-User-Id` stub header outside production, which is
// what the dev-only "act as" switcher uses. A bearer token always wins when both are present.

const BASE = "/api/v1";
const TOKEN_KEY = "authToken";
const ACTING_USER_KEY = "actingUserId";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Dev-only impersonation, mirroring the backend's non-production `X-User-Id` fallback. */
export function getActingUserId(): string | null {
  return localStorage.getItem(ACTING_USER_KEY);
}

export function setActingUserId(id: string | null): void {
  if (id) localStorage.setItem(ACTING_USER_KEY, id);
  else localStorage.removeItem(ACTING_USER_KEY);
}

export function clearCredentials(): void {
  setToken(null);
  setActingUserId(null);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    // Only ever sent when there is no real token, matching the backend's precedence.
    const uid = getActingUserId();
    if (uid) headers["X-User-Id"] = uid;
  }

  let payload: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(BASE + path, { method, headers, body: payload });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail
          ? JSON.stringify(detail)
          : `${res.status} ${res.statusText}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
