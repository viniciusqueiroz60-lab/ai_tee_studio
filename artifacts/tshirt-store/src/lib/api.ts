import { getIdToken } from "./firebase";

export const SESSION_KEY = "tshirt_guest_session_id";

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionId(id: string): void {
  localStorage.setItem(SESSION_KEY, id);
}

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getIdToken();
  const sessionId = getSessionId();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (sessionId && !token) {
    headers["X-Session-Id"] = sessionId;
  }

  return fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers,
  });
}

export async function apiJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
