import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, listAccessibleTools } from "@/lib/access";
import { Sidebar } from "@/components/panel/sidebar";
import { Topbar } from "@/components/panel/topbar";
import { CommandPalette } from "@/components/panel/command-palette";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Command palette only lists tools the user can actually open.
  const accessible = await listAccessibleTools(user);
  const tools = accessible.map((t) => ({ slug: t.slug, name: t.name }));

  return (
    <div className="flex min-h-screen">
      <Sidebar name={user.name ?? "You"} email={user.email} role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 dot-grid">
          <div className="mx-auto w-full max-w-[1280px] px-8 py-10">{children}</div>
        </main>
      </div>
      <CommandPalette tools={tools} isAdmin={user.role === "admin"} />
    </div>
  );
}
