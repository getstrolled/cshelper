import EditDashboard from "@/app/edit/edit-dashboard";
import { getSession } from "@/lib/auth";
import {
  sessionSecretIssue,
  sessionSecretOk,
  sessionSecretTrimmedLength,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EditPage() {
  if (!sessionSecretOk()) {
    const issue = sessionSecretIssue();
    const len = sessionSecretTrimmedLength();
    return (
      <main>
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/80 px-3 py-2 text-sm text-amber-200">
          {issue === "missing"
            ? "SESSION_SECRET is not visible to the Node process. add it to .env.local or .env.production in the project root (same folder as package.json), then restart pm2 with: pm2 restart cshelper --update-env. must be 32+ characters."
            : `SESSION_SECRET is only ${len} characters after trimming; iron-session needs 32+. fix quotes, accidental spaces, or line breaks in the env file.`}
        </p>
      </main>
    );
  }

  const session = await getSession();

  return (
    <EditDashboard
      initialLoggedIn={!!session.loggedIn}
      initialRole={session.role ?? null}
    />
  );
}
