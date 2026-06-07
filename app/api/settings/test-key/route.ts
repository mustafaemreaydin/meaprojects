import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/access";
import { getAdapter, getApiKey } from "@/lib/llm";

const ProviderSchema = z.enum(["openrouter"]);
const Body = z.object({ provider: ProviderSchema });

function metaKeyFor(provider: z.infer<typeof ProviderSchema>): string {
  return `apiKeyMeta:${provider}`;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const { provider } = parsed.data;

  const apiKey = await getApiKey(provider);
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Anahtar tanımlı değil." },
      { status: 400 }
    );
  }

  let ok = false;
  let error: string | undefined;
  try {
    const result = await getAdapter(provider).testKey(apiKey);
    ok = result.ok;
    if (!result.ok) error = result.error;
  } catch (e) {
    ok = false;
    error = e instanceof Error ? e.message : "Beklenmeyen hata.";
  }

  const meta = JSON.stringify({ lastTestedAt: new Date().toISOString(), lastTestOk: ok });
  const key = metaKeyFor(provider);
  await prisma.setting.upsert({
    where: { key },
    update: { value: meta },
    create: { key, value: meta },
  });

  if (ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false, error: error ?? "Test başarısız." }, { status: 400 });
}
