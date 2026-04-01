FROM node:20-alpine AS deps

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git grep curl

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Copy application source
COPY server.js ./
COPY src/ ./src/
COPY public/ ./public/

EXPOSE 8787 8788

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -f http://localhost:${HEALTHCHECK_PORT:-8787}/health || exit 1

CMD ["node", "server.js"]
