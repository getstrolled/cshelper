import fs from "fs";
import { requireRole } from "@/lib/auth";
import { notifyActivity, notifyBackupDiscord } from "@/lib/discord";
import { getDatabaseFilePath } from "@/lib/db";
import { clientIp } from "@/lib/ip";
import { backupLimiter, consumeUnlessAdmin } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  try {
    await consumeUnlessAdmin(ip, backupLimiter);
  } catch {
    return NextResponse.json(
      { error: "too many backups — wait an hour or so" },
      { status: 429 },
    );
  }

  const cronSecret = process.env.BACKUP_CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  let okCron = false;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    okCron = true;
  }

  if (!okCron) {
    const auth = await requireRole(["admin"]);
    if (auth instanceof Response) return auth;
  }

  const fp = getDatabaseFilePath();
  let buf: Buffer;
  try {
    buf = fs.readFileSync(fp);
  } catch {
    return NextResponse.json({ error: "could not read db file" }, { status: 500 });
  }

  const filename = `cshelper-${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
  const sent = await notifyBackupDiscord(filename, buf);

  if (!sent.ok && sent.note?.includes("no backup webhook")) {
    await notifyActivity("backup ran but DISCORD_BACKUP_WEBHOOK_URL isnt set");
    return NextResponse.json({ ok: true, note: "saved locally only (no backup webhook)" });
  }

  if (!sent.ok) {
    await notifyActivity(`backup failed: ${sent.note ?? "unknown"}`);
    return NextResponse.json({ ok: false, note: sent.note }, { status: 502 });
  }

  await notifyActivity(`db backup sent (${filename})`);

  return NextResponse.json({ ok: true, filename });
}
