import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const APEX = process.env.NEXT_PUBLIC_APP_DOMAIN; // e.g. "meaprojects.com" (prod)
const secret = process.env.NEXTAUTH_SECRET;

/** Returns the tool subdomain (slug) for tool subdomains, else null. */
function getToolSubdomain(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  let sub: string | null = null;
  if (hostname.endsWith(".localhost")) {
    sub = hostname.slice(0, -".localhost".length);
  } else if (APEX && hostname !== APEX && hostname.endsWith("." + APEX)) {
    sub = hostname.slice(0, -("." + APEX).length);
  }
  if (!sub || sub === "www" || sub.includes(".")) return null;
  return sub;
}

// Pages that require a session.
const PROTECTED = ["/dashboard", "/apps", "/tools", "/logs", "/settings", "/admin", "/docs"];
// Pages only admins may view.
const ADMIN_ONLY = ["/dashboard", "/logs", "/settings", "/admin", "/docs"];

const isRunPath = (p: string) => /^\/tools\/[^/]+\/run(\/|$)/.test(p);
const hasPrefix = (p: string, list: string[]) =>
  list.some((x) => p === x || p.startsWith(x + "/"));

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const url = req.nextUrl;
  const path = url.pathname;
  const sub = getToolSubdomain(host);

  // ── Tool subdomain: slug.<apex> / slug.localhost ──
  if (sub) {
    // Assets, API, auth & Next internals must serve normally on this origin.
    if (
      path.startsWith("/api/") ||
      path.startsWith("/_next/") ||
      path === "/favicon.ico" ||
      path === "/not-authorized"
    ) {
      return NextResponse.next();
    }
    const token = await getToken({ req, secret });
    if (!token) {
      const apexBase = APEX ? `https://${APEX}` : `http://localhost:${url.port || "3000"}`;
      const callback = `${url.protocol}//${host}${path}${url.search}`;
      return NextResponse.redirect(`${apexBase}/login?callbackUrl=${encodeURIComponent(callback)}`);
    }
    const rw = url.clone();
    rw.pathname = `/_tool/${sub}`;
    rw.search = "";
    return NextResponse.rewrite(rw);
  }

  // ── Apex / www ──
  if (!hasPrefix(path, PROTECTED)) return NextResponse.next();

  const token = await getToken({ req, secret });
  if (!token) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  const role = (token.role as string) ?? "member";
  if (role !== "admin") {
    // Members may view their own account, but no other settings/admin area.
    const isOwnAccount = path === "/settings/account";
    const adminPage =
      !isOwnAccount &&
      (hasPrefix(path, ADMIN_ONLY) ||
        // /tools, /tools/upload, /tools/<slug> are admin — but /tools/<slug>/run is allowed
        path === "/tools" ||
        (path.startsWith("/tools/") && !isRunPath(path)));
    if (adminPage) {
      return NextResponse.redirect(new URL("/apps", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except static assets and the NextAuth endpoints.
    "/((?!_next/static|_next/image|api/auth|favicon.ico|fonts/|mea-|logo-|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|ttf|woff|woff2|css|js|map)$).*)",
  ],
};
