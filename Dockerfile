# Updated from node:18-alpine to fix undici Node version requirement
FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
# Use --legacy-peer-deps to avoid strict peer dependency resolution in container builds
RUN npm install --ignore-scripts --legacy-peer-deps  # Removed --production to include dev deps needed for build; kept --ignore-scripts for Prisma

# Rebuild the source code only when needed
FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
# Ensure runtime has OpenSSL/libssl for Prisma query engine
RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl ca-certificates libssl-dev \
	|| true \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files
# Copy full node_modules so runtime scripts have their dependencies
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Prisma-specific runtime files (kept for smaller delta and safety)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Copy entrypoint and make executable
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]