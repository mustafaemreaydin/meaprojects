import fs from "node:fs/promises";
import path from "node:path";
import { Download } from "lucide-react";
import { PROJECT_ROOT } from "@/lib/tools/paths";
import { DocsNav, DocsArticle } from "./docs-view";

const DOCS = [
  { id: "mea-ui", label: "Design (mea-ui)" },
  { id: "manifest-spec", label: "Tool Manifest" },
  { id: "bridge-api", label: "Bridge API" },
];

async function readDoc(id: string): Promise<string> {
  const filePath = path.join(PROJECT_ROOT, "docs", `${id}.md`);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return `# ${id}\n\n_Document not found._`;
  }
}

export default async function DocsPage({
  searchParams,
}: {
  searchParams: { doc?: string };
}) {
  const activeId = DOCS.find((d) => d.id === searchParams.doc)?.id ?? DOCS[0].id;
  const content = await readDoc(activeId);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-h1 text-text">Docs</h1>
          <p className="mt-2 max-w-md text-[14px] text-text-muted">
            Quick reference for writing tools and using the bridge API. Building with AI?
            Download the full guide and hand it to your assistant.
          </p>
        </div>
        <a
          href="/meaprojects-tool-guide.md"
          download="meaprojects-tool-guide.md"
          className="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 h-11 text-[13.5px] font-medium text-text transition-colors hover:border-ink-400 dark:bg-ink-800 dark:hover:border-ink-500"
        >
          <Download size={15} className="text-text-muted transition-transform group-hover:translate-y-0.5" />
          Download AI build guide
        </a>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[200px_1fr]">
        <aside className="lg:sticky lg:top-[80px] lg:self-start">
          <DocsNav items={DOCS} activeId={activeId} />
        </aside>
        <section className="min-w-0">
          <DocsArticle markdown={content} />
        </section>
      </div>
    </div>
  );
}
