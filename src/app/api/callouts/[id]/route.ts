import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callouts } from "@/lib/db/schema";
import { notifyActivity } from "@/lib/discord";
import { clientIp } from "@/lib/ip";
import { consumeUnlessAdmin, writeLimiter } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

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
  await db.delete(callouts).where(eq(callouts.id, id));

  await notifyActivity(`${auth.role} deleted callout #${id}`);

  return NextResponse.json({ ok: true });
}
