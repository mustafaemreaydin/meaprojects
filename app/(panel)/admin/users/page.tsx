import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { UsersManager, type ManagedUser, type ToolOption } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/apps");

  const [users, tools] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        toolAccess: { select: { toolId: true } },
      },
    }),
    prisma.tool.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);

  const managed: ManagedUser[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role === "admin" ? "admin" : "member",
    createdAt: u.createdAt.toISOString(),
    toolIds: u.toolAccess.map((t) => t.toolId),
  }));
  const toolOptions: ToolOption[] = tools.map((t) => ({ id: t.id, name: t.name, slug: t.slug }));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-h1 text-text">Users</h1>
        <p className="mt-2 text-[14px] text-text-muted">
          Create accounts for people you want to share tools with, and grant per-tool access.
        </p>
      </header>
      <UsersManager initialUsers={managed} tools={toolOptions} />
    </div>
  );
}
