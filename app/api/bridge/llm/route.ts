import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireToolAccess } from "@/lib/access";
import { handleLlmComplete } from "@/lib/bridge/handlers";

const BodySchema = z.object({
  // Defaults to OpenRouter — the single gateway to every model.
  provider: z.enum(["openrouter", "anthropic", "openai", "google"]).default("openrouter"),
  model: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })
    )
    .min(1),
  maxTokens: z.number().int().positive().max(8192).optional(),
  temperature: z.number().min(0).max(2).optional(),
  system: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const slug = req.headers.get("x-meaprojects-tool");
  if (!slug) return NextResponse.json({ error: "Tool slug eksik." }, { status: 400 });

  const access = await requireToolAccess(slug);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 401 ? "Unauthorized" : access.status === 404 ? "Tool not found." : "Forbidden" },
      { status: access.status }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz istek: " + parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  try {
    const result = await handleLlmComplete(slug, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
