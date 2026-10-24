import DemoSignInButton from "@/components/DemoSignInButton";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { demoConfigured } from "@/lib/demo";
import { MAX_USERS } from "@/lib/authErrors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-[0.2em] pl-[0.2em]">DEVELOP</h1>
        <p className="text-sm tracking-widest text-muted">wellness tracker</p>
        <p className="pt-3 text-muted">Calories, macros, workouts, and cardio in one place.</p>
      </div>

      {error === "full" ? (
        <p role="alert" className="rounded-xl bg-card p-3 text-center text-sm text-muted">
          DEVELOP is a personal project limited to {MAX_USERS} accounts, and it&apos;s full. New
          sign-ups are closed.
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
        {demoConfigured(process.env) && <DemoSignInButton />}
      </div>
    </main>
  );
}
