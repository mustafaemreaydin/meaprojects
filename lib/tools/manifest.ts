import { z } from "zod";
import { KNOWN_PERMISSIONS } from "@/lib/permissions";

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$/;

export const ToolTypeSchema = z.enum(["static", "spa", "backend"]);
export type ToolType = z.infer<typeof ToolTypeSchema>;

export const BackendManifestSchema = z.object({
  runtime: z.string().min(1),
  start: z.string().min(1),
  requirements: z.string().optional(),
  healthcheck: z.string().optional(),
});

export const ManifestSchema = z
  .object({
    slug: z
      .string()
      .regex(SLUG_REGEX, "slug kebab-case, 3-42 karakter, sadece a-z 0-9 ve - olabilir."),
    name: z.string().min(1).max(80),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "semver bekleniyor (örn. 1.0.0)"),
    description: z.string().max(280).optional(),
    icon: z.string().optional(),
    type: ToolTypeSchema,
    entry: z.string().min(1),
    author: z.string().optional(),
    permissions: z.array(z.string()).default([]),
    backend: BackendManifestSchema.optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "backend" && !data.backend) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "type='backend' ise 'backend' alanı zorunlu.",
        path: ["backend"],
      });
    }
    const unknown = data.permissions.filter(
      (p) => !(KNOWN_PERMISSIONS as readonly string[]).includes(p)
    );
    if (unknown.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Bilinmeyen izin(ler): ${unknown.join(", ")}`,
        path: ["permissions"],
      });
    }
  });

export type Manifest = z.infer<typeof ManifestSchema>;

export function parseManifest(raw: unknown): Manifest {
  return ManifestSchema.parse(raw);
}

export function safeParseManifest(raw: unknown) {
  return ManifestSchema.safeParse(raw);
}
