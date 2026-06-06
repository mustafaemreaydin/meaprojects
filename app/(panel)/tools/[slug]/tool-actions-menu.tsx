"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ToolActionsMenu({ slug, status }: { slug: string; status: string }) {
  const router = useRouter();

  const toggle = async () => {
    const next = status === "installed" ? "disabled" : "installed";
    const res = await fetch(`/api/tools/${slug}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      toast.success(next === "installed" ? "Enabled" : "Disabled");
      router.refresh();
    } else toast.error("Operation failed");
  };

  const remove = async () => {
    if (!confirm("Are you sure you want to delete this tool? Files and DB records will be removed.")) return;
    const res = await fetch(`/api/tools/${slug}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Tool deleted");
      router.push("/tools");
      router.refresh();
    } else toast.error("Delete failed");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" aria-label="More">
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={toggle}>
          {status === "installed" ? (
            <>
              <PauseCircle size={14} /> Disable
            </>
          ) : (
            <>
              <PlayCircle size={14} /> Enable
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={remove}>
          <Trash2 size={14} /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
