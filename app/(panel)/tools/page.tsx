import Link from "next/link";
import { Boxes, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listTools } from "@/lib/tools/registry";
import { ToolsBrowser } from "./tools-browser";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const tools = await listTools();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 text-text">Tools</h1>
          <p className="mt-2 text-[14px] text-text-muted">
            All your installed tools, sorted by installation date.
          </p>
        </div>
        <Button asChild>
          <Link href="/tools/upload">
            <UploadCloud size={15} /> Upload tool
          </Link>
        </Button>
      </header>

      {tools.length === 0 ? (
        <EmptyState
          icon={<Boxes size={22} />}
          title="No tools yet."
          description="Upload your first tool and start using it from a single panel."
          action={
            <Button asChild>
              <Link href="/tools/upload">
                <UploadCloud size={15} /> Upload tool
              </Link>
            </Button>
          }
        />
      ) : (
        <ToolsBrowser tools={tools} />
      )}
    </div>
  );
}
