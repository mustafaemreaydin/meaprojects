"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Check, X, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatBytes } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { describePermission } from "@/lib/permissions";

type Step = "idle" | "extract" | "validate" | "install" | "confirm" | "done" | "error";

interface UploadState {
  step: Step;
  file?: File;
  error?: string;
  manifest?: {
    slug: string;
    name: string;
    version: string;
    description?: string;
    type: string;
    permissions: string[];
  };
  existingSlug?: boolean;
}

export function ToolUploader() {
  const router = useRouter();
  const [state, setState] = React.useState<UploadState>({ step: "idle" });
  const [pendingZip, setPendingZip] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const onFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Only .zip files are accepted.");
      return;
    }
    setPendingZip(file);
    setState({ step: "extract", file });

    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", "preview");
    setState((s) => ({ ...s, step: "validate" }));

    const res = await fetch("/api/tools", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setState({ step: "error", file, error: data?.error ?? "Upload failed." });
      return;
    }
    setState({
      step: "confirm",
      file,
      manifest: data.manifest,
      existingSlug: data.existingSlug,
    });
  };

  const onConfirm = async () => {
    if (!pendingZip) return;
    setState((s) => ({ ...s, step: "install" }));
    const fd = new FormData();
    fd.append("file", pendingZip);
    fd.append("mode", "install");
    const res = await fetch("/api/tools", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setState({ step: "error", file: pendingZip, error: data?.error ?? "Installation failed." });
      return;
    }
    setState({ step: "done", file: pendingZip, manifest: data.manifest });
    toast.success(`${data.manifest.name} installed`, {
      description: data.updated ? "Updated." : "New tool added.",
    });
    router.push(`/tools/${data.manifest.slug}`);
    router.refresh();
  };

  const onCancel = () => {
    setState({ step: "idle" });
    setPendingZip(null);
  };

  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void onFile(f);
  };

  return (
    <div className="flex flex-col gap-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={drop}
        className={cn(
          "flex h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-[var(--bg-elevated)] transition-colors",
          dragOver ? "border-ink-400 bg-ink-100/20 dark:bg-ink-700/20" : "border-ink-200 dark:border-ink-600"
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-100 text-ink-500 dark:bg-ink-700">
          <UploadCloud size={20} />
        </div>
        <p className="mt-4 text-[15px] text-text">Drop your zip here or browse</p>
        <p className="mt-1 text-[13px] text-text-muted">
          tool.json is validated, you approve permissions, then it installs.
        </p>
        <label className="mt-5 inline-flex">
          <input
            type="file"
            accept=".zip"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-ink-200 bg-[var(--surface)] px-3 text-[13.5px] text-text hover:bg-paper-200 dark:border-ink-600 dark:hover:bg-ink-700">
            <FileArchive size={14} /> Browse file
          </span>
        </label>
      </div>

      {state.step !== "idle" && state.file && (
        <div className="rounded-lg border border-ink-100 bg-[var(--surface)] p-5 dark:border-ink-600">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileArchive size={18} className="text-ink-400" />
              <div>
                <div className="text-[14px] font-medium text-text">{state.file.name}</div>
                <div className="text-[12px] text-text-muted">{formatBytes(state.file.size)}</div>
              </div>
            </div>
            {state.step !== "done" && state.step !== "error" && (
              <button
                onClick={onCancel}
                className="rounded-md p-1.5 text-text-muted hover:bg-paper-200 dark:hover:bg-ink-700"
                aria-label="Cancel"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <ol className="flex flex-col gap-2.5">
            <ProgressRow done={["validate", "install", "confirm", "done"].includes(state.step)} loading={state.step === "extract"}>
              Extracting zip
            </ProgressRow>
            <ProgressRow done={["install", "confirm", "done"].includes(state.step)} loading={state.step === "validate"}>
              Validating manifest
            </ProgressRow>
            <ProgressRow done={state.step === "done"} loading={state.step === "install"}>
              Installing
            </ProgressRow>
          </ol>

          {state.step === "error" && state.error && (
            <div className="mt-4 rounded-md border border-[var(--danger)]/40 bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-[13px] text-[var(--danger)]">
              {state.error}
            </div>
          )}

          {state.step === "error" && (
            <Button variant="secondary" size="sm" onClick={onCancel} className="mt-4">
              Dismiss
            </Button>
          )}
        </div>
      )}

      <Dialog open={state.step === "confirm"} onOpenChange={(o) => !o && onCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve permissions</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-text">{state.manifest?.name}</span> (v{state.manifest?.version}){" "}
              {state.existingSlug ? "will be updated" : "will be installed"}. It requests the following permissions:
            </DialogDescription>
          </DialogHeader>

          <ul className="flex flex-col gap-2 my-2">
            {(state.manifest?.permissions ?? []).length === 0 && (
              <li className="text-[13.5px] text-text-muted">No permissions requested.</li>
            )}
            {state.manifest?.permissions.map((p) => {
              const info = describePermission(p);
              return (
                <li
                  key={p}
                  className="rounded-md border border-ink-100 px-3 py-2.5 dark:border-ink-600"
                >
                  <div className="text-[13.5px] font-medium text-text">{info.label}</div>
                  <div className="text-[12.5px] text-text-muted mt-0.5">{info.description}</div>
                </li>
              );
            })}
          </ul>

          <DialogFooter>
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onConfirm}>
              <Check size={14} /> Approve &amp; install
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgressRow({
  done,
  loading,
  children,
}: {
  done: boolean;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 text-[13.5px]">
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border",
          done
            ? "border-ink-400 bg-ink-400 text-white"
            : loading
            ? "border-ink-400 bg-transparent"
            : "border-ink-200 bg-transparent dark:border-ink-600"
        )}
      >
        {done ? <Check size={12} /> : loading ? <Spinner size={10} /> : null}
      </span>
      <span className={cn(done || loading ? "text-text" : "text-text-muted")}>{children}</span>
    </li>
  );
}
