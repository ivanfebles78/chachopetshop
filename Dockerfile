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
# Arranque: APLICA MIGRACIONES VERSIONADAS y arranca la API.
#
# Antes se ejecutaba `prisma db push`, que sincroniza el esquema a la fuerza y
# ante una divergencia puede ELIMINAR columnas y sus datos sin preguntar. Está
# pensado para prototipar, no para una base con pedidos reales, y además no
# dejaba historial: no había forma de saber qué cambió ni de revertirlo.
#
# `migrate deploy` sólo aplica migraciones ya escritas y revisadas, nunca
# improvisa un cambio de esquema, y falla si encuentra algo que no esperaba.
#
# La siembra ya NO va aquí. Poblar el catálogo es una operación de datos, no de
# arranque, y un contenedor que se reinicia no debería tocar el contenido de la
# tienda. Queda como comando explícito: `npm run db:seed`.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
