import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canAccessTool } from "@/lib/access";
import { ToolRunner } from "./tool-runner";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[]>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tool = await prisma.tool.findUnique({ where: { slug: params.slug } });
  if (!tool) notFound();

  // Members may only run tools they have been granted (or public ones).
  const allowed = await canAccessTool(user.id, user.role, tool);
  if (!allowed) redirect("/not-authorized");

  if (tool.type === "backend") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[var(--bg)] text-text p-8">
        <h1 className="text-h2">Bu tool backend tipinde.</h1>
        <p className="mt-2 text-[14px] text-text-muted max-w-[420px] text-center">
          Backend tool çalıştırma desteği v2'de gelecek. MVP'de yalnızca statik ve SPA
          tool'ları çalıştırılabilir.
        </p>
        <a
          href={`/tools/${tool.slug}`}
          className="mt-6 text-mist-500 underline-offset-4 hover:underline"
        >
          Detaya dön
        </a>
      </div>
    );
  }

  const manifest = safeJson<{ entry?: string }>(tool.manifest) ?? {};
  const entry = manifest.entry ?? "index.html";

  // Flatten searchParams (take first value per key) and pass to the runner.
  const launchParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams ?? {})) {
    launchParams[k] = Array.isArray(v) ? v[0] : v;
  }

  return (
    <ToolRunner
      slug={tool.slug}
      name={tool.name}
      entry={entry}
      userName={user.name ?? "You"}
      userId={user.id}
      params={launchParams}
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
