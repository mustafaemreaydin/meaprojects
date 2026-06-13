import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canAccessTool } from "@/lib/access";
import { ToolRunner } from "@/app/(immersive)/tools/[slug]/run/tool-runner";

export const dynamic = "force-dynamic";

/**
 * Rendered when a request arrives on a tool subdomain (e.g. slug.meaprojects.com).
 * The middleware rewrites such requests to /t/<slug>. Access is enforced here.
 */
export default async function SubtoolPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tool = await prisma.tool.findUnique({ where: { slug: params.slug } });
  if (!tool) notFound();

  if (!(await canAccessTool(user.id, user.role, tool))) {
    redirect("/not-authorized");
  }

  if (tool.status !== "installed" || tool.type === "backend") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[var(--bg)] p-8 text-center text-text">
        <h1 className="text-h2">This tool isn&apos;t available.</h1>
        <p className="max-w-[420px] text-[14px] text-text-muted">
          {tool.type === "backend"
            ? "Backend tool execution is coming in a later phase."
            : "This tool is currently disabled."}
        </p>
      </div>
    );
  }

  const manifest = safeJson<{ entry?: string }>(tool.manifest) ?? {};
  const entry = manifest.entry ?? "index.html";

  return (
    <ToolRunner
      slug={tool.slug}
      name={tool.name}
      entry={entry}
      userName={user.name ?? "You"}
      userId={user.id}
      standalone
    />
  );
}

function safeJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
