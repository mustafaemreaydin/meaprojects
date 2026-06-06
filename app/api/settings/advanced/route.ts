import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/access";

const Body = z.object({
  op: z.enum(["clear-logs", "clear-llm-calls", "clear-storage"]),
});

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  let deleted = 0;
  switch (parsed.data.op) {
    case "clear-llm-calls": {
      const r = await prisma.llmCall.deleteMany({});
      deleted = r.count;
      break;
    }
    case "clear-logs": {
      const r = await prisma.toolRun.deleteMany({});
      deleted = r.count;
      break;
    }
    case "clear-storage": {
      const r = await prisma.toolStorage.deleteMany({});
      deleted = r.count;
      break;
    }
  }

  return NextResponse.json({ ok: true, deleted });
}
