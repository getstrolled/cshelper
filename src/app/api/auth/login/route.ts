import { getSession, roleFromPassword } from "@/lib/auth";
import { clientIp } from "@/lib/ip";
import { loginLimiter } from "@/lib/rate-limit";
import { sessionSecretOk } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!sessionSecretOk()) {
    return NextResponse.json(
      { error: "server missing SESSION_SECRET (needs 32+ chars)" },
      { status: 500 },
    );
  }

  const ip = clientIp(req);
  try {
    await loginLimiter.consume(ip);
  } catch {
    return NextResponse.json(
      { error: "too many tries, wait like a minute" },
      { status: 429 },
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const role = roleFromPassword(body.password ?? "");
  if (!role) {
    return NextResponse.json({ error: "nope" }, { status: 401 });
  }

  const session = await getSession();
  session.role = role;
  session.loggedIn = true;
  await session.save();

  return NextResponse.json({ ok: true, role });
}
