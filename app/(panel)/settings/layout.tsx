import { getCurrentUser } from "@/lib/access";
import { SettingsNav } from "./settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-h1 text-text">Settings</h1>
        <p className="mt-2 text-[14px] text-text-muted">
          {isAdmin ? "Manage your account, API keys, and appearance." : "Your account."}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[200px_1fr]">
        <aside className="lg:sticky lg:top-[80px] lg:self-start">
          <SettingsNav isAdmin={isAdmin} />
        </aside>
        <section>{children}</section>
      </div>
    </div>
  );
}
