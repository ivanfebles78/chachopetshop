# Chacho Pet Shop — imagen única: la API Express sirve también el frontend React.
# Railway detecta este Dockerfile y lo usa en lugar de autodetección (railpack).

FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------- Build del frontend (client → client/dist) ----------
FROM base AS client-build
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client ./client
RUN cd client && npm run build

# ---------- Build del backend (server → server/dist) ----------
FROM base AS server-build
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server ./server
RUN cd server && npx prisma generate && npm run build

# ---------- Imagen final de ejecución ----------
FROM base AS runtime
ENV NODE_ENV=production
# Backend compilado + node_modules (incluye prisma CLI y tsx para migrar/sembrar)
COPY --from=server-build /app/server /app/server
# Frontend compilado en la ruta que espera el servidor (../../client/dist)
COPY --from=client-build /app/client/dist /app/client/dist
WORKDIR /app/server
# 1) Aplica el esquema  2) siembra SOLO si la BD está vacía  3) arranca la API
# (la API sirve también el frontend en la misma URL).
CMD ["sh", "-c", "npx prisma db push --skip-generate && { SEED_ONLY_IF_EMPTY=1 npx tsx prisma/seed.ts || echo 'seed omitido'; } && node dist/index.js"]
