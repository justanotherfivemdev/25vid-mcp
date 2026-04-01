FROM node:20-alpine AS deps

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git grep

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Copy application source
COPY server.js ./
COPY src/ ./src/
COPY public/ ./public/

EXPOSE 8787 8788

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http=require('http');const port=process.env.HEALTHCHECK_PORT||'8787';http.get('http://localhost:'+port+'/health',(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>process.exit(JSON.parse(d).status==='ok'?0:1))})"

CMD ["node", "server.js"]
