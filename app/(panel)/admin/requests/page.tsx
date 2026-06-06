import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { requireAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import { RequestsList, type RequestItem } from "./requests-list";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/apps");

  const rows = await prisma.contactRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const items: RequestItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-h1 text-text">Requests</h1>
        <p className="mt-2 text-[14px] text-text-muted">
          Messages submitted through the landing page contact form.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={<Mail size={20} />}
          title="No requests yet."
          description="When someone sends a message from the landing page, it appears here."
        />
      ) : (
        <RequestsList items={items} />
      )}
    </div>
  );
}
