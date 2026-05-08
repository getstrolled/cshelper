import fs from "fs";
import path from "path";
import { r2PublicConfigured } from "@/lib/asset-url";

/** True if `webPath` exists locally on disk, or we serve it from R2 (assume migrated). */
export function publicFileExists(webPath: string | null | undefined): boolean {
  if (!webPath?.trim()) return false;
  const p = webPath.trim();
  if (p.startsWith("//") || p.includes("..")) return false;
  if (/^https?:\/\//i.test(p)) return true;

  if (
    r2PublicConfigured() &&
    (p.startsWith("/uploads/") || p.startsWith("/maps/"))
  ) {
    return true;
  }

  const clean = p.replace(/^\//, "");
  if (!clean) return false;
  const fp = path.join(process.cwd(), "public", clean);
  try {
    return fs.statSync(fp).isFile();
  } catch {
    return false;
  }
}
