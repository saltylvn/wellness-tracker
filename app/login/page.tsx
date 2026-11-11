import DemoSignInButton from "@/components/DemoSignInButton";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import PasswordLogin from "@/components/PasswordLogin";
import NewcomerCard from "@/components/NewcomerCard";
import { DATABASE_BEHIND_MESSAGE } from "@/lib/dbErrors";
import { normalizeInviteCode } from "@/lib/accounts";
import { demoConfigured } from "@/lib/demo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string; join?: string }>;
}) {
  const { error, invite, join } = await searchParams;
  // An invite link from a text message: /login?invite=CODE opens "Create an account".
  const inviteCode = normalizeInviteCode(invite);
  // A new person: they opened an invite link, Google didn't let them in because they're new,
  // their invite code didn't work, or a password login failed and they tapped "New here?".
  // They get one card: the wait-list, with "Received an invite code?" to use a code instead.
  const newcomer =
    Boolean(inviteCode) || Boolean(join) || error === "invite" || error === "full" || error === "badinvite";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-[0.2em] pl-[0.2em]">DEVELOP</h1>
        <p className="text-sm tracking-widest text-muted">wellness tracker</p>
        <p className="pt-3 text-muted">Calories, macros, workouts, and cardio in one place.</p>
      </div>

      {error === "setup" ? (
        <p role="alert" className="rounded-xl bg-card p-3 text-center text-sm text-danger">
          {DATABASE_BEHIND_MESSAGE}
        </p>
      ) : error === "demo" ? (
        <p role="alert" className="rounded-xl bg-card p-3 text-center text-sm text-danger">
          The demo isn&apos;t available right now. Please try again later.
        </p>
      ) : error && !newcomer ? (
        <p role="alert" className="rounded-xl bg-card p-3 text-center text-sm text-danger">
          Sign-in didn&apos;t work. Please try again.
        </p>
      ) : null}

      {newcomer ? (
        <div className="space-y-3">
          <NewcomerCard
            invite={inviteCode}
            initialTab={inviteCode || error === "badinvite" || join === "code" ? "code" : "waitlist"}
            codeError={error === "badinvite" ? "That invite code isn't valid, was already used, or has expired." : null}
          />
          <a href="/login" className="flex min-h-11 items-center justify-center text-sm font-medium text-muted active:opacity-70">
            Already have an account? Log in
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <GoogleSignInButton />
          <PasswordLogin />
          {demoConfigured(process.env) && <DemoSignInButton />}
        </div>
      )}
    </main>
  );
}
