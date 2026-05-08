import EditDashboard from "@/app/edit/edit-dashboard";
import { getSession } from "@/lib/auth";
import { sessionSecretOk } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EditPage() {
  if (!sessionSecretOk()) {
    return (
      <main>
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/80 px-3 py-2 text-sm text-amber-200">
          add SESSION_SECRET to your env (32+ chars). otherwise iron-session breaks and login wont work.
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
