/**
 * Uploads existing public/uploads/** and public/maps/** into R2 using keys that match
 * DB paths (uploads/…, maps/…). No DB changes — set R2_PUBLIC_BASE_URL on the app after.
 *
 * Loads .env then .env.local (later wins) into process.env.
 */
import fs from "fs";
import path from "path";
import { putR2Object, r2WriteConfigured } from "../src/lib/r2";

function loadEnvFiles() {
  const root = process.cwd();
  for (const name of [".env", ".env.local"]) {
    const fp = path.join(root, name);
    if (!fs.existsSync(fp)) continue;
    const raw = fs.readFileSync(fp, "utf8");
    for (let line of raw.split("\n")) {
      line = line.split("#")[0]!.trim();
      if (!line) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

function mimeForExt(ext: string): string {
  const e = ext.toLowerCase();
  const m: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".m4v": "video/x-m4v",
  };
  return m[e] ?? "application/octet-stream";
}

function collectUnder(baseAbs: string, keyPrefix: string): { key: string; abs: string }[] {
  const out: { key: string; abs: string }[] = [];
  if (!fs.existsSync(baseAbs)) return out;

  function walk(dir: string) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(abs);
      } else if (ent.isFile()) {
        const rel = path.relative(baseAbs, abs).replace(/\\/g, "/");
        const key = `${keyPrefix}/${rel}`.replace(/\/+/g, "/");
        out.push({ key, abs });
      }
    }
  }
  walk(baseAbs);
  return out;
}

async function main() {
  loadEnvFiles();

  if (!r2WriteConfigured()) {
    console.error(
      "Missing R2 env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME",
    );
    process.exit(1);
  }

  const publicRoot = path.join(process.cwd(), "public");
  const uploadsDir = path.join(publicRoot, "uploads");
  const mapsDir = path.join(publicRoot, "maps");

  const files = [
    ...collectUnder(uploadsDir, "uploads"),
    ...collectUnder(mapsDir, "maps"),
  ];

  if (files.length === 0) {
    console.log("No files under public/uploads or public/maps — nothing to upload.");
    process.exit(0);
  }

  console.log(`Uploading ${files.length} file(s) to R2…`);

  for (const { key, abs } of files) {
    const buf = fs.readFileSync(abs);
    const ext = path.extname(abs);
    const ct = mimeForExt(ext);
    process.stdout.write(`  ${key} (${buf.length} bytes)… `);
    await putR2Object(key, buf, ct);
    console.log("ok");
  }

  console.log("\nDone. Set R2_PUBLIC_BASE_URL on the server to your R2 public URL (same paths in DB).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
