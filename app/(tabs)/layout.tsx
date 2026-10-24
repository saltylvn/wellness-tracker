import DemoBanner from "@/components/DemoBanner";
import TabBar from "@/components/TabBar";
import { isDemoEmail } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

// (tabs) is a "route group": the parentheses mean the folder name is NOT part
// of the URL, so /food, /workouts and /settings all share this layout (the tab bar).
export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  // getClaims reads the signed login token (no network trip), so this check is cheap.
  const { data } = await (await createClient()).auth.getClaims();
  const inDemo = isDemoEmail(data?.claims.email, process.env.DEMO_EMAIL);

  return (
    <>
      {/* pt = room for the notch; pb = room so content isn't hidden behind the tab bar */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        {inDemo && <DemoBanner />}
        {children}
      </main>
      <TabBar />
    </>
  );
}
