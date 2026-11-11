import Link from "next/link";

// The friendly page shown when something goes wrong (app/error.tsx) or a link leads nowhere
// (app/not-found.tsx): a short title and message, a main action, and a way back to Fitness.
export default function ErrorScreen({
  title,
  message,
  action,
  reference,
}: {
  title: string;
  message: string;
  action?: React.ReactNode; // e.g. a "Try again" button
  reference?: string; // the error's id, to match it with the server logs
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center">
      <div className="space-y-2">
        <p className="text-sm font-extrabold tracking-[0.2em] pl-[0.2em]">DEVELOP</p>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted">{message}</p>
      </div>
      <div className="space-y-3">
        {action}
        <Link
          href="/workouts"
          className="flex min-h-12 w-full items-center justify-center rounded-full border border-border bg-card px-4 text-base font-semibold active:opacity-80"
        >
          Go to Fitness
        </Link>
      </div>
      {reference && <p className="text-xs text-muted">Reference: {reference}</p>}
    </main>
  );
}
