"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Trash2, KeyRound, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatRelativeTime } from "@/lib/utils";

export interface ToolOption {
  id: string;
  name: string;
  slug: string;
}
export interface ManagedUser {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "member";
  createdAt: string;
  toolIds: string[];
}

export function UsersManager({
  initialUsers,
  tools,
}: {
  initialUsers: ManagedUser[];
  tools: ToolOption[];
}) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        name: fd.get("name"),
        password: fd.get("password"),
      }),
    });
    setPending(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success("Member created.");
      setCreating(false);
      router.refresh();
    } else {
      toast.error(data.error ?? "Could not create user.");
    }
  }

  const members = initialUsers.filter((u) => u.role === "member");
  const admins = initialUsers.filter((u) => u.role === "admin");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          {members.length} member{members.length === 1 ? "" : "s"}
        </p>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          <UserPlus size={14} /> {creating ? "Cancel" : "New member"}
        </Button>
      </div>

      {creating && (
        <Card>
          <CardContent className="py-5">
            <form onSubmit={createUser} className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
              <label className="flex flex-col gap-1.5">
                <span className="caption">Name</span>
                <Input name="name" placeholder="Optional" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="caption">Email</span>
                <Input name="email" type="email" required placeholder="person@example.com" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="caption">Password</span>
                <Input name="password" type="text" required placeholder="min 6 chars" className="font-mono text-[13px]" />
              </label>
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? <Spinner size={12} /> : <Check size={14} />} Create member
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {admins.map((u) => (
        <UserRow key={u.id} user={u} tools={tools} />
      ))}
      {members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] px-5 py-10 text-center text-[13.5px] text-text-muted">
          No members yet. Create one to share specific tools.
        </p>
      ) : (
        members.map((u) => <UserRow key={u.id} user={u} tools={tools} />)
      )}
    </div>
  );
}

function UserRow({ user, tools }: { user: ManagedUser; tools: ToolOption[] }) {
  const router = useRouter();
  const isAdmin = user.role === "admin";
  const [granted, setGranted] = React.useState<Set<string>>(new Set(user.toolIds));
  const [busy, setBusy] = React.useState<string | null>(null);

  async function toggle(toolId: string) {
    const next = !granted.has(toolId);
    setBusy(toolId);
    const res = await fetch("/api/admin/tool-access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: user.id, toolId, grant: next }),
    });
    setBusy(null);
    if (res.ok) {
      setGranted((prev) => {
        const s = new Set(prev);
        if (next) s.add(toolId);
        else s.delete(toolId);
        return s;
      });
    } else {
      toast.error("Could not update access.");
    }
  }

  async function resetPassword() {
    const pw = prompt(`New password for ${user.email} (min 6 chars):`);
    if (!pw) return;
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) toast.success("Password updated.");
    else toast.error("Could not update password.");
  }

  async function remove() {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User deleted.");
      router.refresh();
    } else toast.error("Could not delete user.");
  }

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[13px] font-semibold text-text">
              {(user.name || user.email).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14.5px] font-medium text-text">{user.name || user.email}</span>
                {isAdmin ? <Badge tone="accent">admin</Badge> : <Badge tone="neutral">member</Badge>}
              </div>
              <p className="text-[12.5px] text-text-muted">{user.email}</p>
              <p className="text-[11.5px] text-text-muted mt-0.5">joined {formatRelativeTime(user.createdAt)}</p>
            </div>
          </div>
          {!isAdmin && (
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="ghost" onClick={resetPassword}>
                <KeyRound size={13} /> Reset
              </Button>
              <Button size="sm" variant="danger" onClick={remove}>
                <Trash2 size={13} />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="caption mb-2">Tool access</p>
          {isAdmin ? (
            <p className="text-[12.5px] text-text-muted">Admin has access to all tools.</p>
          ) : tools.length === 0 ? (
            <p className="text-[12.5px] text-text-muted">No tools installed yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tools.map((t) => {
                const on = granted.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    disabled={busy === t.id}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] transition-colors",
                      on
                        ? "border-ink-400 bg-ink-100 text-ink-900 dark:bg-ink-700 dark:text-paper-100"
                        : "border-[var(--border)] text-text-muted hover:text-text hover:bg-[var(--bg-elevated)]"
                    )}
                  >
                    {busy === t.id ? <Spinner size={11} /> : on ? <Check size={12} /> : null}
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
