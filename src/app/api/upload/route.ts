import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { requireRole } from "@/lib/auth";
import { notifyActivity } from "@/lib/discord";
import { clientIp } from "@/lib/ip";
import { consumeUnlessAdmin, uploadLimiter } from "@/lib/rate-limit";
import { putR2Object, r2UploadConfigured } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".mkv", ".m4v"]);
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

function extOf(name: string): string {
  return path.extname(name).slice(0, 12).toLowerCase();
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  try {
    await consumeUnlessAdmin(ip, uploadLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "need file field" }, { status: 400 });
  }

  const ext = extOf(file.name);
  const looksVideo = VIDEO_EXT.has(ext) || file.type.startsWith("video/");
  const looksImage =
    IMAGE_EXT.test(file.name) || file.type.startsWith("image/");

  if (looksVideo && looksImage) {
    return NextResponse.json({ error: "pick either an image or a video" }, { status: 400 });
  }

  const auth = looksVideo
    ? await requireRole(["helper", "trusted", "admin"])
    : await requireRole(["trusted", "admin"]);
  if (auth instanceof Response) return auth;

  if (looksVideo) {
    if (!VIDEO_EXT.has(ext)) {
      return NextResponse.json(
        { error: "video type not allowed — use mp4, webm, mov, mkv, or m4v" },
        { status: 400 },
      );
    }
    if (file.type && !file.type.startsWith("video/")) {
      return NextResponse.json({ error: "not a video file" }, { status: 400 });
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "video too big (max 50mb)" }, { status: 400 });
    }
  } else if (looksImage || (!file.type && !ext)) {
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "file too big (max 8mb)" }, { status: 400 });
    }
  } else {
    return NextResponse.json(
      { error: "upload an image or a supported video file" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const safeExt = /^\.[a-z0-9]+$/i.test(ext) ? ext : looksVideo ? ".mp4" : ".png";
  const name = `${randomUUID()}${safeExt}`;
  const publicPath = `/uploads/${name}`;

  if (r2UploadConfigured()) {
    const key = `uploads/${name}`;
    const contentType =
      file.type?.trim() ||
      (looksVideo ? "video/mp4" : "application/octet-stream");
    await putR2Object(key, buf, contentType);
  } else {
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    const fp = path.join(dir, name);
    await fs.writeFile(fp, buf);
  }

  await notifyActivity(`${auth.role} uploaded **${name}**`);

  return NextResponse.json({ path: publicPath });
}
