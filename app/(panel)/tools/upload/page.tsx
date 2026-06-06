import { ToolUploader } from "@/components/tools/tool-uploader";

export default function UploadPage() {
  return (
    <div className="flex flex-col gap-8 max-w-[760px]">
      <header>
        <h1 className="text-h1 text-text">Upload tool</h1>
        <p className="mt-2 text-[14.5px] text-text-muted">
          The zip must contain a <span className="font-mono text-[13px]">tool.json</span> manifest. You will review permissions before installation.
        </p>
      </header>

      <ToolUploader />
    </div>
  );
}
