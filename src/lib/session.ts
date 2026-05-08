import type { SessionOptions } from "iron-session";

export type Role = "helper" | "trusted" | "admin";

export type SessionData = {
  role?: Role;
  loggedIn?: boolean;
};

export function sessionSecretOk(): boolean {
  return (process.env.SESSION_SECRET?.length ?? 0) >= 32;
}

export function getSessionOptions(): SessionOptions {
  const pw = process.env.SESSION_SECRET ?? "";
  if (pw.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return {
    cookieName: "cshelper_session",
    password: pw,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    },
  };
}
