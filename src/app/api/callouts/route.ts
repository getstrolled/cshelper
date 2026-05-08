import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callouts } from "@/lib/db/schema";
import { notifyActivity } from "@/lib/discord";
import { clientIp } from "@/lib/ip";
import { consumeUnlessAdmin, readLimiter, writeLimiter } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const bodySchema = z.object({
  mapId: z.number().int(),
  name: z.string().min(1).max(120),
});

export async function GET(req: NextRequest) {
  try {
    await consumeUnlessAdmin(clientIp(req), readLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) {
    return NextResponse.json({ error: "need mapId" }, { status: 400 });
  }
  const id = Number.parseInt(mapId, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "bad mapId" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db.select().from(callouts).where(eq(callouts.mapId, id));
  return NextResponse.json({ callouts: rows });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  try {
    await consumeUnlessAdmin(ip, writeLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const auth = await requireRole(["trusted", "admin"]);
  if (auth instanceof Response) return auth;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const parsed = bodySchema.parse(raw);
  const db = getDb();
  const [row] = await db
    .insert(callouts)
    .values({
      mapId: parsed.mapId,
      name: parsed.name.trim(),
    })
    .returning({ id: callouts.id });

  await notifyActivity(
    `${auth.role} added call **${parsed.name.trim()}** on map ${parsed.mapId}`,
  );

  return NextResponse.json({ ok: true, id: row.id });
}
