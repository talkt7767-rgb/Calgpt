import { getRequest } from "@tanstack/react-start/server";

interface RateLimitRecord {
  attempts: number[];
  bannedUntil: number;
}

const store = new Map<string, RateLimitRecord>();

/**
 * Checks rate limiting for a specific action/endpoint and key (IP or user ID).
 * If the key has made >= 5 attempts within 15 minutes, they are banned for 15 minutes.
 * Throws an Error if rate limit is exceeded.
 */
export function checkRateLimit(endpoint: string, identifier: string) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  const key = `${endpoint}:${identifier}`;

  let record = store.get(key);
  if (!record) {
    record = { attempts: [], bannedUntil: 0 };
  }

  // Check if currently banned
  if (record.bannedUntil > now) {
    const minutesLeft = Math.ceil((record.bannedUntil - now) / 60000);
    throw new Error(
      `Too many attempts. You are temporarily banned from this action for ${minutesLeft} minute(s).`
    );
  }

  // Filter attempts to keep only those within the window
  record.attempts = record.attempts.filter((timestamp) => now - timestamp < windowMs);

  if (record.attempts.length >= maxAttempts) {
    record.bannedUntil = now + windowMs;
    store.set(key, record);
    throw new Error("Too many attempts. You have been banned for 15 minutes.");
  }

  record.attempts.push(now);
  store.set(key, record);
}

/**
 * Helper to get the request's IP address.
 */
export function getClientIp(): string {
  const request = getRequest();
  if (!request?.headers) return "127.0.0.1";
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}
