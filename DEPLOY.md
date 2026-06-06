# Deploying meaprojects.com

This app is a Next.js 14 (App Router) panel with NextAuth (credentials), Prisma + SQLite,
and a tool runtime that serves uploaded tools both **in-panel** and on **per-tool
subdomains** (`toolslug.meaprojects.com`).

The recommended host is a small **VPS + Docker + Caddy** (reverse proxy with automatic
wildcard TLS). This is the only setup that fully supports always-on tools and wildcard
subdomains. Vercel works for the panel + static/SPA tools but cannot run always-on backend
tools and needs a managed Postgres (SQLite is not persistent on serverless).

---

## 1. DNS

Point both the apex and a wildcard at your server's IP:

```
A     meaprojects.com         <SERVER_IP>
A     *.meaprojects.com       <SERVER_IP>
```

The wildcard makes every `*.meaprojects.com` tool subdomain resolve to the same server.
Wildcard TLS is issued via a **DNS-01 challenge**, so use a DNS provider supported by
Caddy (Cloudflare, etc.) and create an API token for it.

## 2. Environment (`.env`)

```ini
DATABASE_URL="file:./data/meaprojects.db"
NEXTAUTH_URL="https://meaprojects.com"
NEXTAUTH_SECRET="<openssl rand -base64 32>"
SETTINGS_ENCRYPTION_KEY="<openssl rand -hex 32>"   # exactly 64 hex chars

# Cross-subdomain SSO: the session cookie is shared across the apex and every
# tool subdomain. REQUIRED for subdomain access to work.
COOKIE_DOMAIN=".meaprojects.com"

# Lets the app show/open subdomain links and resolve subdomains in middleware.
NEXT_PUBLIC_APP_DOMAIN="meaprojects.com"

# Seed admin (run once)
ADMIN_EMAIL="mustafa@meaprojects.com"
ADMIN_PASSWORD="<your password>"
ADMIN_NAME="Mustafa"

LLM_RATE_LIMIT_PER_MIN="30"
```

> The app reads `COOKIE_DOMAIN` in `lib/auth.ts` and `NEXT_PUBLIC_APP_DOMAIN` in
> `middleware.ts` + the Apps gallery. Without them, subdomain SSO is disabled (fine for
> local dev — see §6).

## 3. Docker & Caddy — files are in the repo

These are committed and ready: **`Dockerfile`**, **`.dockerignore`**, **`docker-compose.yml`**,
**`Caddyfile`**. You don't need to write them.

- `docker-compose.yml` runs two containers: **app** (Next.js, migrations applied on boot) and
  **caddy** (reverse proxy + automatic HTTPS). Host folders `./data` and `./tools` are mounted
  as persistent volumes.
- TLS uses **on-demand certificates** (HTTP-01) so you need **plain DNS A records only — no
  DNS-provider API token**. Caddy asks the app (`/api/tls-check`) before issuing a cert and
  only allows the apex + `*.meaprojects.com`.

The whole platform — apex, panel, and every tool subdomain — is served by the one app
container; `middleware.ts` inspects the `Host` header and routes tool subdomains internally,
so Caddy needs no per-tool config.

## 4. First run (on the VPS)

```bash
docker compose up -d --build          # build + start (migrations run automatically)
docker compose exec app npm run seed  # create the admin from .env (once)
docker compose logs -f                # watch
```

Then sign in at `https://meaprojects.com/login`, add your OpenRouter key under
**Settings → API Keys**, upload a tool, set its access (`granted`/`public`), and create
members under **Users**. Health check: `https://meaprojects.com/api/health`.

## 6. Local development note

Browsers treat `localhost` and `slug.localhost` as **separate hosts**, so the session
cookie set on `localhost` is not shared with `slug.localhost` — full subdomain SSO can't be
exercised locally. The subdomain routing itself is testable: a request to
`slug.localhost:3000` without a session 307-redirects to `/login` (verified). In production,
`COOKIE_DOMAIN=".meaprojects.com"` makes the apex session valid on every tool subdomain.

## 7. Backups

Snapshot the two volumes — `./data` (SQLite DB) and `./tools` (tool packages). Optionally
add [Litestream](https://litestream.io) for continuous SQLite replication to object storage.

---

## Roadmap — backend tools (future phase)

Today, tools are static/SPA bundles served by the panel and the LLM bridge. To support
tools that need their own server process (`type: "backend"` in the manifest — see the v2
TODO in `lib/tools/registry.ts`):

- Build each backend tool into its own container.
- Register the container with the reverse proxy keyed by subdomain
  (`toolslug.meaprojects.com` → that container), still behind the same auth/access gate.
- Add health checks + lifecycle management (start/stop/restart) to the admin Tools page.

This keeps the access model identical — only the runtime/serving layer changes.
