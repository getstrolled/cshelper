import { getSession } from "@/lib/auth";
import { clientIp } from "@/lib/ip";
import { consumeUnlessAdmin, readLimiter } from "@/lib/rate-limit";
import { sessionSecretOk } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await consumeUnlessAdmin(clientIp(req), readLimiter);
  } catch {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  if (!sessionSecretOk()) {
    return NextResponse.json({ loggedIn: false, role: null });
  }

  const session = await getSession();
  return NextResponse.json({
    loggedIn: !!session.loggedIn,
    role: session.role ?? null,
  });
}
