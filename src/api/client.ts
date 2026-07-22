// Thin fetch wrapper around the Kickoff API.
//
// Auth is currently the backend's stub: an `X-User-Id` header identifies the acting user. We read
// it from localStorage on every request so the "act as" switcher takes effect immediately. When the
// backend swaps to Firebase, only this file changes (send `Authorization: Bearer <token>` instead).

const BASE = "/api/v1";
const ACTING_USER_KEY = "actingUserId";

export function getActingUserId(): string | null {
  return localStorage.getItem(ACTING_USER_KEY);
}

export function setActingUserId(id: string | null): void {
  if (id) localStorage.setItem(ACTING_USER_KEY, id);
  else localStorage.removeItem(ACTING_USER_KEY);
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
  const uid = getActingUserId();
  if (uid) headers["X-User-Id"] = uid;

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
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
