// One-off: install the starter tool directly (bypasses HTTP/auth) for local testing.
// Run: npx tsx scripts/install-starter.ts
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROOT = process.cwd();

async function main() {
  const src = path.join(ROOT, "starter-tool");
  const manifest = JSON.parse(fs.readFileSync(path.join(src, "tool.json"), "utf8"));
  const slug: string = manifest.slug;

  const dest = path.join(ROOT, "tools", slug);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
  }

  const data = {
    slug,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description ?? null,
    icon: manifest.icon ?? null,
    type: manifest.type,
    manifest: JSON.stringify(manifest),
    permissions: JSON.stringify(manifest.permissions ?? []),
    status: "installed",
    access: "public", // visible to everyone for testing
  };

  await prisma.tool.upsert({ where: { slug }, create: data, update: data });
  console.log(`Installed tool '${slug}' (access=public) at tools/${slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
