import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/access";
import { encryptString } from "@/lib/crypto";
import { settingKeyFor } from "@/lib/llm";

const ProviderSchema = z.enum(["openrouter", "anthropic", "openai", "google"]);

const PostBody = z.object({
  provider: ProviderSchema,
  apiKey: z.string().min(1).max(500),
});

function metaKeyFor(provider: z.infer<typeof ProviderSchema>): string {
  return `apiKeyMeta:${provider}`;
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = PostBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { provider, apiKey } = parsed.data;
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Anahtar boş olamaz." }, { status: 400 });
  }

  if (provider === "google") {
    return NextResponse.json(
      { error: "Google sağlayıcısı v2'de etkinleşecek." },
      { status: 400 }
    );
  }

  const encrypted = encryptString(trimmed);
  const key = settingKeyFor(provider);

  await prisma.setting.upsert({
    where: { key },
    update: { value: encrypted },
    create: { key, value: encrypted },
  });

  await prisma.setting.deleteMany({ where: { key: metaKeyFor(provider) } });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const providerRaw = url.searchParams.get("provider");
  const parsed = ProviderSchema.safeParse(providerRaw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz provider." }, { status: 400 });
  }

  const provider = parsed.data;
  await prisma.setting.deleteMany({
    where: { key: { in: [settingKeyFor(provider), metaKeyFor(provider)] } },
  });

  return NextResponse.json({ ok: true });
}
