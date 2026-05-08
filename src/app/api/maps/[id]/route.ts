import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { maps } from "@/lib/db/schema";
import { notifyActivity } from "@/lib/discord";
import { clientIp } from "@/lib/ip";
import { consumeUnlessAdmin, writeLimiter } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  imagePath: z.string().max(500).nullable().optional(),
  calloutsImagePath: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().optional(),
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

  const updates: Partial<typeof maps.$inferInsert> = {};
  if (parsed.name !== undefined) updates.name = parsed.name.trim();
  if (parsed.slug !== undefined) updates.slug = parsed.slug;
  if (parsed.imagePath !== undefined) updates.imagePath = parsed.imagePath;
  if (parsed.calloutsImagePath !== undefined)
    updates.calloutsImagePath = parsed.calloutsImagePath;
  if (parsed.sortOrder !== undefined) updates.sortOrder = parsed.sortOrder;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  await db.update(maps).set(updates).where(eq(maps.id, id));

  await notifyActivity(`${auth.role} updated map #${id}`);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const ip = clientIp(req);
  try {
    await consumeUnlessAdmin(ip, writeLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const auth = await requireRole(["admin"]);
  if (auth instanceof Response) return auth;

  const id = Number.parseInt((await ctx.params).id, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  const db = getDb();
  await db.delete(maps).where(eq(maps.id, id));

  await notifyActivity(`admin deleted map #${id}`);

  return NextResponse.json({ ok: true });
}
