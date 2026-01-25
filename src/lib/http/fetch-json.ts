import { HttpError } from "@/lib/http/http-error";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as {
    error?: { message?: unknown };
    message?: unknown;
  };

  const candidate = obj.error?.message ?? obj.message;
  if (typeof candidate === "string" && candidate.trim()) return candidate;
  return null;
}

export async function fetchJson<T>(args: {
  url: string;
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string;
}): Promise<T> {
  const res = await fetch(args.url, {
    method: args.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(args.accessToken ? { Authorization: `Bearer ${args.accessToken}` } : {}),
    },
    body: args.body !== undefined ? JSON.stringify(args.body) : undefined,
  });

  if (res.ok) return (await res.json()) as T;

  let message = res.statusText || "Nieznany błąd.";
  const contentType = res.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await res.json().catch(() => null);
    const extracted = extractErrorMessage(payload);
    if (extracted) {
      message = extracted;
    } else if (payload && typeof payload === "object") {
      message = JSON.stringify(payload);
    }
  } else {
    const text = await res.text().catch(() => "");
    if (text) message = text;
  }

  if (res.status === 401) {
    throw new HttpError(401, message || "Brak autoryzacji (401).");
  }
  throw new HttpError(res.status, message);
}

