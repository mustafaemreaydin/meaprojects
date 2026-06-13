import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/runner";

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; name: string } }
) {
  const job = await prisma.toolJob.findFirst({
    where: { toolSlug: params.slug, name: params.name, type: "webhook", status: "active" },
  });

  if (!job) return NextResponse.json({ error: "Webhook bulunamadı." }, { status: 404 });

  // Body'yi storage'a yaz ki job code erişebilsin
  const body = await req.text();
  if (body) {
    await prisma.toolStorage.upsert({
      where: { toolId_key: { toolId: job.toolId, key: `__webhook__${job.name}__payload` } },
      create: { toolId: job.toolId, key: `__webhook__${job.name}__payload`, value: body },
      update: { value: body },
    });
  }

  // Async çalıştır (webhook yanıtını bekletme)
  runJob(job.id).catch((err) => console.error("[webhook]", err));

  return NextResponse.json({ ok: true });
}

// GET ile de tetiklenebilsin (basit URL trigger için)
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string; name: string } }
) {
  return POST(req, { params });
}
