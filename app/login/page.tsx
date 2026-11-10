import DemoSignInButton from "@/components/DemoSignInButton";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import PasswordLogin from "@/components/PasswordLogin";
import { normalizeInviteCode } from "@/lib/accounts";
import { demoConfigured } from "@/lib/demo";
import { MAX_USERS } from "@/lib/authErrors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string }>;
}) {
  const { error, invite } = await searchParams;
  // An invite link from a text message: /login?invite=CODE opens "Create an account".
  const inviteCode = normalizeInviteCode(invite);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-[0.2em] pl-[0.2em]">DEVELOP</h1>
        <p className="text-sm tracking-widest text-muted">wellness tracker</p>
        <p className="pt-3 text-muted">Calories, macros, workouts, and cardio in one place.</p>
      </div>

      {error === "invite" || error === "full" ? (
        <p role="alert" className="rounded-xl bg-card p-3 text-center text-sm text-muted">
          DEVELOP is invite-only (a personal project of up to {MAX_USERS} accounts). If you were
          texted an invite, tap its link, or choose Log in with password, then Create an account.
        </p>
      ) : error === "demo" ? (
        <p role="alert" className="rounded-xl bg-card p-3 text-center text-sm text-danger">
          The demo isn&apos;t available right now. Please try again later.
        </p>
      ) : error ? (
        <p role="alert" className="rounded-xl bg-card p-3 text-center text-sm text-danger">
          Sign-in didn&apos;t work. Please try again.
        </p>
      ) : null}

      <div className="space-y-3">
        <GoogleSignInButton />
        <PasswordLogin invite={inviteCode} />
        {demoConfigured(process.env) && <DemoSignInButton />}
      </div>
    </main>
  );
}
