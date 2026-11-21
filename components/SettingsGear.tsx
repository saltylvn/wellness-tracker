import Link from "next/link";

// The ⚙️ button at the top right of every tab (and the Nutrition page). They all lead to the
// same shared Settings page (goals, AI, sign out), so the app has one place for settings.
export default function SettingsGear() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="flex h-11 w-11 items-center justify-center rounded-full text-xl active:bg-card"
    >
      ⚙️
    </Link>
  );
}
