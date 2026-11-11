import DemoSignInButton from "@/components/DemoSignInButton";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import InviteGoogleForm from "@/components/InviteGoogleForm";
import PasswordLogin from "@/components/PasswordLogin";
import WaitlistForm from "@/components/WaitlistForm";
import { DATABASE_BEHIND_MESSAGE } from "@/lib/dbErrors";
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
  // A new person: they opened an invite link, or Google didn't let them in because they're
  // new. They're asked for their invite code (filled in from the link) before Google.
  const newcomer = Boolean(inviteCode) || error === "invite" || error === "full" || error === "badinvite";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-[0.2em] pl-[0.2em]">DEVELOP</h1>
        <p className="text-sm tracking-widest text-muted">wellness tracker</p>
        <p className="pt-3 text-muted">Calories, macros, workouts, and cardio in one place.</p>
      </div>

      {error === "invite" || error === "full" ? (
        <p role="alert" className="rounded-xl bg-card p-3 text-center text-sm text-muted">
          You&apos;re new here! DEVELOP is invite-only (a personal project of up to {MAX_USERS}{" "}
          accounts), so enter the invite code from your text to continue.
        </p>
      ) : error === "badinvite" ? (
        <p role="alert" className="rounded-xl bg-card p-3 text-center text-sm text-danger">
          That invite code isn&apos;t valid, was already used, or has expired.
        </p>
      ) : error === "setup" ? (
        <p role="alert" className="rounded-xl bg-card p-3 text-center text-sm text-danger">
          {DATABASE_BEHIND_MESSAGE}
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
        {newcomer ? <InviteGoogleForm invite={inviteCode} /> : <GoogleSignInButton />}
        <PasswordLogin invite={inviteCode} newcomer={newcomer} />
        {/* Only after a login didn't let someone in (Google refused a new person, or a bad code). */}
        {(error === "invite" || error === "full" || error === "badinvite") && <WaitlistForm />}
        {demoConfigured(process.env) && <DemoSignInButton />}
      </div>
    </main>
  );
}
