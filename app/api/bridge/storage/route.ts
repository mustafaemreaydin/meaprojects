import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireToolAccess } from "@/lib/access";
import {
  handleStorageGet,
  handleStorageSet,
  handleStorageDelete,
  handleStorageList,
  handleStorageGetAll,
} from "@/lib/bridge/handlers";

const BodySchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("get"), key: z.string().min(1).max(120) }),
  z.object({
    op: z.literal("set"),
    key: z.string().min(1).max(120),
    value: z.unknown(),
  }),
  z.object({ op: z.literal("delete"), key: z.string().min(1).max(120) }),
  z.object({ op: z.literal("list"), prefix: z.string().max(120).default("") }),
  z.object({ op: z.literal("getAll"), prefix: z.string().max(120).default("") }),
]);

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
    return NextResponse.json({ error: "Geçersiz body." }, { status: 400 });
  }

  try {
    let result: unknown;
    switch (parsed.data.op) {
      case "get":
        result = await handleStorageGet(slug, parsed.data.key);
        break;
      case "set":
        result = await handleStorageSet(slug, parsed.data.key, parsed.data.value);
        break;
      case "delete":
        result = await handleStorageDelete(slug, parsed.data.key);
        break;
      case "list":
        result = await handleStorageList(slug, parsed.data.prefix ?? "");
        break;
      case "getAll":
        result = await handleStorageGetAll(slug, parsed.data.prefix ?? "");
        break;
    }
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
