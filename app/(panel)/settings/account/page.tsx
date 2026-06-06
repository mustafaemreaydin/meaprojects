import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });

  return (
    <div className="flex flex-col gap-6 max-w-[560px]">
      <div>
        <h2 className="text-h2 text-text">Account</h2>
        <p className="mt-1 text-[14px] text-text-muted">Your personal information and session status.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-5">
          <Row label="Name">{user?.name ?? "—"}</Row>
          <Row label="Email">{user?.email}</Row>
          <Row label="Account created">{user ? formatDateTime(user.createdAt) : "—"}</Row>
          <Row label="Session">
            <Badge tone="success">active</Badge>
          </Row>
        </CardContent>
      </Card>

      <p className="text-[13px] text-text-muted">
        meaprojects.com is single-user. Password management is coming in v2; for now it is managed via{" "}
        <code className="font-mono">.env</code>.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-100 pb-3 last:border-b-0 last:pb-0 dark:border-ink-600">
      <span className="caption">{label}</span>
      <span className="text-[14px] text-text">{children}</span>
    </div>
  );
}
