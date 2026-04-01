FROM node:20-alpine

WORKDIR /app

# Install git for git-based tools
RUN apk add --no-cache git grep

# Copy dependency files first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy application source
COPY server.js ./
COPY src/ ./src/

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8787/health || exit 1

CMD ["node", "server.js"]
