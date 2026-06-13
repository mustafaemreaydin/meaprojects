import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "member";
}

/** Resolve the signed-in user (with role) from the DB, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role === "admin" ? "admin" : "member",
  };
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

/**
 * Guard for admin-only server actions / route handlers.
 * Returns the admin user, or null when the caller is not an admin.
 */
export async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

/** Can this user open/run a given tool? Admin → always. */
export async function canAccessTool(
  userId: string,
  role: "admin" | "member",
  tool: { id: string; access: string }
): Promise<boolean> {
  if (role === "admin") return true;
  if (tool.access === "public") return true;
  // For any non-public tool, an explicit per-user grant (set by the admin on the
  // Users page) grants access — regardless of whether the tool is marked
  // "private" or "granted". Granting a user IS the intent to let them in.
  const grant = await prisma.toolAccess.findUnique({
    where: { userId_toolId: { userId, toolId: tool.id } },
  });
  return Boolean(grant);
}

/**
 * Guard for bridge endpoints: resolves the current user and checks they may use
 * the given tool slug. Prevents a logged-in member from invoking a tool they
 * weren't granted by spoofing the x-meaprojects-tool header.
 */
export async function requireToolAccess(slug: string): Promise<
  | { ok: true; userId: string; userName: string | null }
  | { ok: false; status: 401 | 403 | 404 }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401 };
  const tool = await prisma.tool.findUnique({ where: { slug }, select: { id: true, access: true } });
  if (!tool) return { ok: false, status: 404 };
  const allowed = await canAccessTool(user.id, user.role, tool);
  if (!allowed) return { ok: false, status: 403 };
  return { ok: true, userId: user.id, userName: user.name };
}

/** List the tools the current user is allowed to launch. */
export async function listAccessibleTools(user: CurrentUser) {
  if (user.role === "admin") {
    return prisma.tool.findMany({ orderBy: { updatedAt: "desc" } });
  }
  return prisma.tool.findMany({
    where: {
      status: "installed",
      OR: [{ access: "public" }, { grants: { some: { userId: user.id } } }],
    },
    orderBy: { updatedAt: "desc" },
  });
}
