import { NextResponse } from "next/server";

// Caddy on-demand TLS "ask" endpoint. Caddy calls this before issuing a cert
// for a hostname; we only allow the apex and its subdomains (*.meaprojects.com).
const APEX = process.env.NEXT_PUBLIC_APP_DOMAIN;

export async function GET(req: Request) {
  const domain = (new URL(req.url).searchParams.get("domain") ?? "").toLowerCase();
  if (!APEX) return new NextResponse("ok", { status: 200 }); // not configured (dev)
  if (domain === APEX || domain.endsWith("." + APEX)) {
    return new NextResponse("ok", { status: 200 });
  }
  return new NextResponse("no", { status: 403 });
}
