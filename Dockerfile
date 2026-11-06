# Next.js production image.
# .env is part of the build context so NEXT_PUBLIC_* values are baked in at build time;
# server-side vars are re-read from the bind-mounted .env at runtime (see compose.yaml).
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOME=/tmp npm_config_cache=/tmp/.npm
COPY --from=build /app ./
# the container runs as a non-root host user, so Next's cache must be writable
RUN mkdir -p .next/cache && chmod -R a+rwX .next
CMD ["npm", "run", "start"]
