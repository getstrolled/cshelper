import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { lineups } from "@/lib/db/schema";
import { notifyActivity } from "@/lib/discord";
import { lineupVideoPathSchema } from "@/lib/lineup-video";
import { clientIp } from "@/lib/ip";
import { consumeUnlessAdmin, readLimiter, writeLimiter } from "@/lib/rate-limit";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const grenades = z.enum(["smoke", "flash", "molly", "he"]);

const bodySchema = z.object({
  mapId: z.number().int(),
  grenadeType: grenades,
  title: z.string().min(1).max(200),
  description: z.string().max(4000),
  videoPath: lineupVideoPathSchema,
});

export async function GET(req: NextRequest) {
  try {
    await consumeUnlessAdmin(clientIp(req), readLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  const db = getDb();

  if (mapId) {
    const id = Number.parseInt(mapId, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "bad mapId" }, { status: 400 });
    }
    const rows = await db
      .select()
      .from(lineups)
      .where(eq(lineups.mapId, id))
      .orderBy(desc(lineups.createdAt));
    return NextResponse.json({ lineups: rows });
  }

  const rows = await db.select().from(lineups).orderBy(desc(lineups.createdAt));
  return NextResponse.json({ lineups: rows });
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
    .insert(lineups)
    .values({
      mapId: parsed.mapId,
      grenadeType: parsed.grenadeType,
      title: parsed.title.trim(),
      description: parsed.description.trim(),
      videoPath: parsed.videoPath,
    })
    .returning({ id: lineups.id });

  await notifyActivity(
    `${auth.role} added lineup **${parsed.title.trim()}** (#${row.id})`,
  );

  return NextResponse.json({ ok: true, id: row.id });
}
