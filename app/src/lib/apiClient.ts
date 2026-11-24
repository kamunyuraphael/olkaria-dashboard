// Shared fetch helpers for calling server/'s real API. Centralizes the one
// thing every authenticated call needs (the Bearer token from localStorage)
// so individual module clients (dispersionClient.ts, co2annClient.ts, …)
// don't each reimplement header-building and error parsing slightly
// differently.

export const AUTH_TOKEN_STORAGE_KEY = "olkaria:auth:token";

// Empty in local dev (Vite proxies /api to the server). In production the
// frontend and API are on different hosts, so set VITE_API_BASE_URL at build
// time to the API's origin, e.g. https://my-api.onrender.com
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/$/, "");
export const apiUrl = (path: string) => `${API_BASE}${path}`;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function authHeader(): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function errorMessageFrom(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

async function handle<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    throw new ApiError(await errorMessageFrom(res, fallback), res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), { headers: { ...authHeader() } });
  return handle<T>(res, `GET ${path} failed (${res.status}).`);
}

export async function apiPostJson<T>(path: string, body: unknown, method: "POST" | "PATCH" | "DELETE" = "POST"): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  return handle<T>(res, `${method} ${path} failed (${res.status}).`);
}

// No Content-Type here - the browser sets the multipart boundary itself
// when the body is a FormData; setting it manually breaks the upload.
export async function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { ...authHeader() },
    body: form,
  });
  return handle<T>(res, `POST ${path} failed (${res.status}).`);
}
