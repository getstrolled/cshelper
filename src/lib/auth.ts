import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import type { Role } from "./session";
import { getSessionOptions, type SessionData } from "./session";

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, getSessionOptions());
}

export function roleFromPassword(password: string): Role | null {
  const admin = process.env.CSHELPER_ADMIN_PASSWORD;
  const trusted = process.env.CSHELPER_TRUSTED_PASSWORD;
  const helper = process.env.CSHELPER_HELPER_PASSWORD;
  if (admin && password === admin) return "admin";
  if (trusted && password === trusted) return "trusted";
  if (helper && password === helper) return "helper";
  return null;
}

export async function requireRole(
  allowed: Role[],
): Promise<{ role: Role } | Response> {
  const session = await getSession();
  const role = session.role;
  if (!session.loggedIn || !role || !allowed.includes(role)) {
    return Response.json({ error: "nope" }, { status: 401 });
  }
  return { role };
}
