import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { maps } from "@/lib/db/schema";
import { notifyActivity } from "@/lib/discord";
import { createMap } from "@/lib/payloads";
import { clientIp } from "@/lib/ip";
import { consumeUnlessAdmin, readLimiter, writeLimiter } from "@/lib/rate-limit";
import { asc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await consumeUnlessAdmin(clientIp(req), readLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }
  const db = getDb();
  const rows = await db.select().from(maps).orderBy(asc(maps.name));
  return NextResponse.json({ maps: rows });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  try {
    await consumeUnlessAdmin(ip, writeLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const auth = await requireRole(["admin"]);
  if (auth instanceof Response) return auth;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const db = getDb();
  try {
    await createMap(db, raw);
  } catch {
    return NextResponse.json({ error: "bad map data" }, { status: 400 });
  }

  await notifyActivity(`admin added a map`);

  return NextResponse.json({ ok: true });
}
