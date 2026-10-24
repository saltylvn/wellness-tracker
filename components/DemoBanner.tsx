import { signOut } from "@/app/(tabs)/settings/actions";

// A slim note at the top of every tab while you're in the shared demo account.
export default function DemoBanner() {
  return (
    <form
      action={signOut}
      className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-card px-3 py-2 text-sm text-muted"
    >
      <span>Demo account · sample data</span>
      <button type="submit" className="min-h-11 px-2 font-medium text-accent active:opacity-70">
        Exit demo
      </button>
    </form>
  );
}
