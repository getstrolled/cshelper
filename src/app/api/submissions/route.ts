import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { submissions } from "@/lib/db/schema";
import { notifyActivity } from "@/lib/discord";
import { clientIp } from "@/lib/ip";
import { submissionPayloadSchema } from "@/lib/payloads";
import { consumeUnlessAdmin, readLimiter, writeLimiter } from "@/lib/rate-limit";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await consumeUnlessAdmin(clientIp(req), readLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const auth = await requireRole(["helper", "admin"]);
  if (auth instanceof Response) return auth;

  const db = getDb();
  const rows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.status, "pending"))
    .orderBy(desc(submissions.createdAt));

  return NextResponse.json({ submissions: rows });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  try {
    await consumeUnlessAdmin(ip, writeLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const auth = await requireRole(["helper"]);
  if (auth instanceof Response) return auth;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const payload = submissionPayloadSchema.parse(raw);
  const db = getDb();
  const [row] = await db
    .insert(submissions)
    .values({
      kind: payload.kind,
      payload: JSON.stringify(payload),
      status: "pending",
    })
    .returning({ id: submissions.id });

  await notifyActivity(
    `new helper request: **${payload.kind}** (id ${row.id})`,
  );

  return NextResponse.json({ ok: true, id: row.id });
}
