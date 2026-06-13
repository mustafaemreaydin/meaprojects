import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireToolAccess } from "@/lib/access";
import { resolveToolBySlug } from "@/lib/bridge/handlers";
import { llmPermissionFor, hasPermission } from "@/lib/permissions";
import { llmRateLimitFor } from "@/lib/rate-limit";
import { llmComplete, llmStream } from "@/lib/llm";
import { prisma } from "@/lib/db";

const BaseSchema = z.object({
  provider: z.string().optional(),
  model: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })
    )
    .min(1),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  system: z.string().optional(),
  stream: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const slug = req.headers.get("x-meaprojects-tool");
  if (!slug) return NextResponse.json({ error: "Tool slug eksik." }, { status: 400 });

  const access = await requireToolAccess(slug);
  if (!access.ok) {
    return NextResponse.json(
      {
        error:
          access.status === 401
            ? "Unauthorized"
            : access.status === 404
            ? "Tool not found."
            : "Forbidden",
      },
      { status: access.status }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = BaseSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz istek: " + parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { provider: _ignored, stream, ...rest } = parsed.data;
  const llmReq = { ...rest, provider: "openrouter" as const };

  // Permission + rate limit — tek seferlik, her iki path için
  try {
    const { permissions } = await resolveToolBySlug(slug);
    if (!hasPermission(permissions, llmPermissionFor("openrouter"))) {
      return NextResponse.json(
        { error: "Bu tool 'llm:openrouter' iznine sahip değil." },
        { status: 403 }
      );
    }
    const rl = llmRateLimitFor(slug);
    if (!rl.ok) {
      const seconds = Math.ceil(rl.retryAfterMs / 1000);
      return NextResponse.json(
        { error: `Çok hızlı çağrı. ${seconds} sn sonra dene.` },
        { status: 429 }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  async function logCall(result: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd?: number | null;
  }) {
    await prisma.llmCall
      .create({
        data: {
          toolSlug: slug!,
          provider: result.provider,
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          costUsd: result.costUsd ?? null,
        },
      })
      .catch(() => undefined);
  }

  // ── Streaming path ──────────────────────────────────────────────────────
  if (stream) {
    const encoder = new TextEncoder();

    const body = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        try {
          const result = await llmStream(llmReq, (chunk) => {
            send({ type: "chunk", chunk });
          });
          send({ type: "done", ...result });
          await logCall(result);
        } catch (err) {
          send({ type: "error", error: (err as Error).message });
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(body, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  }

  // ── Non-streaming path ──────────────────────────────────────────────────
  try {
    const result = await llmComplete(llmReq);
    await logCall(result);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
