import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { notifyActivity } from "@/lib/discord";
import { clientIp } from "@/lib/ip";
import { consumeUnlessAdmin, writeLimiter } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
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
  const [row] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);

  if (!row || row.status !== "pending") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db
    .update(submissions)
    .set({ status: "rejected", reviewedAt: new Date() })
    .where(eq(submissions.id, id));

  await notifyActivity(`rejected **${row.kind}** #${id}`);

  return NextResponse.json({ ok: true });
}
