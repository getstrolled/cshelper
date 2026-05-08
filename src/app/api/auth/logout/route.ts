import { getSession } from "@/lib/auth";
import { sessionSecretOk } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST() {
  if (!sessionSecretOk()) {
    return NextResponse.json({ ok: true });
  }
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
