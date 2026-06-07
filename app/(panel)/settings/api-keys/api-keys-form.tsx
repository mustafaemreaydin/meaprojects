"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface ProviderInfo {
  id: "openrouter";
  label: string;
  placeholder: string;
  available: boolean;
  note?: string;
  hasKey: boolean;
  masked: string | null;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
}

export function ApiKeysForm({ providers }: { providers: ProviderInfo[] }) {
  return (
    <div className="flex flex-col gap-4">
      {providers.map((p) => (
        <ProviderRow key={p.id} provider={p} />
      ))}
    </div>
  );
}

function ProviderRow({ provider }: { provider: ProviderInfo }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [savePending, startSave] = useTransition();
  const [testPending, startTest] = useTransition();
  const [deletePending, startDelete] = useTransition();

  async function save() {
    if (!value.trim()) {
      toast.error("Key cannot be empty.");
      return;
    }
    startSave(async () => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: provider.id, apiKey: value }),
      });
      if (res.ok) {
        toast.success(`${provider.label} key saved.`);
        setValue("");
        setEditing(false);
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Could not save.");
      }
    });
  }

  async function testKey() {
    startTest(async () => {
      const res = await fetch("/api/settings/test-key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: provider.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        toast.success(`${provider.label} connection successful.`);
      } else {
        toast.error(body.error ?? "Test failed.");
      }
      router.refresh();
    });
  }

  async function removeKey() {
    if (!confirm(`Are you sure you want to delete the ${provider.label} key?`)) return;
    startDelete(async () => {
      const res = await fetch(`/api/settings?provider=${provider.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`${provider.label} key deleted.`);
        router.refresh();
      } else {
        toast.error("Could not delete.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[14.5px] font-medium text-text">{provider.label}</span>
              {!provider.available ? (
                <Badge tone="outline">v2</Badge>
              ) : provider.hasKey ? (
                <Badge tone="success">configured</Badge>
              ) : (
                <Badge tone="neutral">not set</Badge>
              )}
            </div>
            {provider.note ? (
              <p className="text-[12.5px] text-text-muted">{provider.note}</p>
            ) : provider.hasKey ? (
              <p className="font-mono text-[12.5px] text-text-muted">{provider.masked}</p>
            ) : (
              <p className="text-[12.5px] text-text-muted">No key entered yet.</p>
            )}
            {provider.lastTestedAt ? (
              <p className="text-[12px] text-text-muted">
                Last test:{" "}
                <span className={cn(provider.lastTestOk ? "text-success" : "text-danger")}>
                  {provider.lastTestOk ? "passed" : "failed"}
                </span>{" "}
                · {formatRelativeTime(provider.lastTestedAt)}
              </p>
            ) : null}
          </div>

          {provider.available ? (
            <div className="flex shrink-0 items-center gap-2">
              {provider.hasKey ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={testKey}
                    disabled={testPending}
                  >
                    {testPending ? <Spinner size={12} /> : null}
                    Test
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing((v) => !v)}
                  >
                    {editing ? "Cancel" : "Change"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={removeKey}
                    disabled={deletePending}
                  >
                    Delete
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditing(true)}
                  disabled={editing}
                >
                  Add key
                </Button>
              )}
            </div>
          ) : null}
        </div>

        {provider.available && (editing || !provider.hasKey) && editing ? (
          <div className="mt-4 flex items-center gap-2">
            <Input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={provider.placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="font-mono text-[13px]"
            />
            <Button type="button" size="sm" onClick={save} disabled={savePending}>
              {savePending ? <Spinner size={12} /> : null}
              Save
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
