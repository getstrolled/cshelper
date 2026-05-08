import fs from "fs";
import path from "path";

/** True if `webPath` like `/uploads/x.png` exists as `public/uploads/x.png` on disk. */
export function publicFileExists(webPath: string | null | undefined): boolean {
  if (!webPath?.trim()) return false;
  const p = webPath.trim();
  if (p.startsWith("//") || p.includes("..")) return false;
  const clean = p.replace(/^\//, "");
  if (!clean) return false;
  const fp = path.join(process.cwd(), "public", clean);
  try {
    return fs.statSync(fp).isFile();
  } catch {
    return false;
  }
}
