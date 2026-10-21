import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

/** Turns thrown HttpError and ZodError into JSON error responses. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof HttpError) return fail(error.status, error.message);
      if (error instanceof ZodError) {
        const first = error.issues[0];
        const where = first?.path.length ? `${first.path.join(".")}: ` : "";
        return fail(400, `${where}${first?.message ?? "Invalid input"}`);
      }
      console.error(error);
      return fail(500, "Something went wrong on the server.");
    }
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Send a JSON body.");
  }
}

/**
 * Client address for rate limits.
 * X-Forwarded-For is only read when TRUST_PROXY=1, and then the rightmost hop
 * (the one a single reverse proxy appends) is used. The left-most value is
 * whatever the caller typed, so trusting it lets someone skip the limit.
 */
export function clientIp(request: Request) {
  if (process.env.TRUST_PROXY === "1") {
    const forwarded = request.headers.get("x-forwarded-for");
    const hops = forwarded?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
    const ip = hops.at(-1) || request.headers.get("x-real-ip")?.trim();
    if (ip) return ip.slice(0, 64);
  }
  return "direct";
}

const hits = new Map<string, number[]>();
const MAX_KEYS = 5000;

/**
 * Per-caller limit. Without TRUST_PROXY every caller shares one address, so the
 * cap is wider there and account-level limits stay tight.
 */
export function limitClient(request: Request, name: string, limit: number, windowMs: number) {
  const ip = clientIp(request);
  rateLimit(`${name}:${ip}`, ip === "direct" ? limit * 8 : limit, windowMs);
}

/** In-process sliding window. Enough for one server; swap for Redis when scaling out. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) throw new HttpError(429, "Too many requests. Try again in a little while.");
  recent.push(now);
  if (!hits.has(key) && hits.size >= MAX_KEYS) {
    const oldest = hits.keys().next().value;
    if (oldest) hits.delete(oldest);
  }
  hits.set(key, recent);
}
