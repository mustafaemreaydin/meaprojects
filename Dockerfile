# meaprojects.com — production image
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# --- deps (all, incl. dev — needed for build + prisma + seed) ---
FROM base AS deps
COPY package*.json ./
RUN npm ci

# --- build ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# --- runtime ---
FROM base AS run
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/styles ./styles
EXPOSE 3000
# Apply migrations on boot, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
