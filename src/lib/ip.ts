import type { NextRequest } from "next/server";

export function clientIp(req: NextRequest | Request): string {
  const h = req.headers;
  const xf = h.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}
