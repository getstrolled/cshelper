import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { lineups } from "@/lib/db/schema";
import { notifyActivity } from "@/lib/discord";
import { lineupVideoPathSchema } from "@/lib/lineup-video";
import { clientIp } from "@/lib/ip";
import { consumeUnlessAdmin, writeLimiter } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const grenades = z.enum(["smoke", "flash", "molly", "he"]);

const patchSchema = z.object({
  mapId: z.number().int(),
  grenadeType: grenades,
  title: z.string().min(1).max(200),
  description: z.string().max(4000),
  videoPath: lineupVideoPathSchema,
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const ip = clientIp(req);
  try {
    await consumeUnlessAdmin(ip, writeLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const auth = await requireRole(["trusted", "admin"]);
  if (auth instanceof Response) return auth;

  const id = Number.parseInt((await ctx.params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const parsed = patchSchema.parse(raw);
  const db = getDb();

  await db
    .update(lineups)
    .set({
      mapId: parsed.mapId,
      grenadeType: parsed.grenadeType,
      title: parsed.title.trim(),
      description: parsed.description.trim(),
      videoPath: parsed.videoPath,
    })
    .where(eq(lineups.id, id));

  await notifyActivity(`${auth.role} edited lineup #${id}`);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const ip = clientIp(req);
  try {
    await consumeUnlessAdmin(ip, writeLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const auth = await requireRole(["trusted", "admin"]);
  if (auth instanceof Response) return auth;

  const id = Number.parseInt((await ctx.params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  const db = getDb();
  await db.delete(lineups).where(eq(lineups.id, id));

  await notifyActivity(`${auth.role} deleted lineup #${id}`);

  return NextResponse.json({ ok: true });
}
