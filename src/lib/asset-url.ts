/**
 * Turn stored paths (/uploads/…, /maps/…) into browser-ready URLs.
 * With R2_PUBLIC_BASE_URL set, prefixes so assets load from R2 (same paths in DB — no migration needed).
 * Absolute http(s) URLs pass through (legacy / manual full URLs).
 */
export function r2PublicConfigured(): boolean {
  return Boolean(process.env.R2_PUBLIC_BASE_URL?.trim());
}

export function resolveAssetUrl(webPath: string | null | undefined): string {
  if (!webPath?.trim()) return "";
  const p = webPath.trim();
  if (/^https?:\/\//i.test(p)) return p;

  const base = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ?? "";
  if (base && p.startsWith("/")) {
    return `${base}${p}`;
  }

  return p;
}
