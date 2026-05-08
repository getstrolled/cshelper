import type { SessionOptions } from "iron-session";

export type Role = "helper" | "trusted" | "admin";

export type SessionData = {
  role?: Role;
  loggedIn?: boolean;
};

/** trimmed length; env sometimes has accidental spaces/newlines */
function sessionSecretTrimmed(): string {
  return (process.env.SESSION_SECRET ?? "").trim();
}

export function sessionSecretOk(): boolean {
  return sessionSecretTrimmed().length >= 32;
}

/** for /edit warning only when secret missing vs too short */
export function sessionSecretIssue(): "ok" | "missing" | "short" {
  const s = sessionSecretTrimmed();
  if (s.length === 0) return "missing";
  if (s.length < 32) return "short";
  return "ok";
}

export function sessionSecretTrimmedLength(): number {
  return sessionSecretTrimmed().length;
}

export function getSessionOptions(): SessionOptions {
  const pw = sessionSecretTrimmed();
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
