import { lastLoginLabel, usernameFromEmail } from "@/lib/accounts";
import { MAX_USERS } from "@/lib/authErrors";
import { isDemoEmail } from "@/lib/demo";

export type AppUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
};

// Settings, for the admin only: everyone with an account, most recent login first. Each row:
// the username (or the Google name / email for Google accounts), how they log in, and when
// they last logged in. Read by admin_list_users (20261106000000_admin_users.sql).
export default function UsersCard({ users, error }: { users: AppUser[]; error: string | null }) {
  const now = new Date();
  const demoEmail = process.env.DEMO_EMAIL;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-muted">Users</p>
        {!error && (
          <p className="text-xs text-muted tabular-nums">
            {users.length} of {MAX_USERS} accounts
          </p>
        )}
      </div>

      {error ? (
        <p className="text-sm text-muted">{error}</p>
      ) : (
        <ul className="divide-y divide-border">
          {users.map((user) => {
            const username = usernameFromEmail(user.email);
            const demo = isDemoEmail(user.email, demoEmail);
            const name = demo ? "Demo account" : (username ?? user.full_name ?? user.email ?? "Unknown");
            const how = demo
              ? "Try the demo"
              : username
                ? "Password"
                : `Google${user.full_name && user.email ? ` · ${user.email}` : ""}`;
            return (
              <li key={user.id} className="flex min-h-14 items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-base font-semibold">
                    <span className="truncate">{name}</span>
                    {user.is_admin && (
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-on-accent">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{how}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium tabular-nums">{lastLoginLabel(user.last_sign_in_at, now)}</p>
                  <p className="text-xs text-muted">last login</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
