import { getSession } from "@/lib/auth";
import { RateLimiterMemory } from "rate-limiter-flexible";

export const loginLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60,
});

export const writeLimiter = new RateLimiterMemory({
  points: 2,
  duration: 60,
});

export const readLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60,
});

export const backupLimiter = new RateLimiterMemory({
  points: 3,
  duration: 3600,
});

/** Upload endpoint — 10 requests per minute per IP (admins bypass). */
export const uploadLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

/** Skips rate limiting when the session is an authenticated admin. */
export async function consumeUnlessAdmin(
  ip: string,
  limiter: RateLimiterMemory,
): Promise<void> {
  const session = await getSession();
  if (session.loggedIn && session.role === "admin") return;
  await limiter.consume(ip);
}
