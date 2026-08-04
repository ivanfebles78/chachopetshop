# 🐾 NutriPet

Tienda online de **nutrición y accesorios para mascotas** (perros, gatos, aves, roedores, peces, reptiles).
Escaparate con diseño premium animado + tienda completa: catálogo facetado, carrito, checkout, cuentas y panel de administración.

> Datos de demostración. Catálogo, precios y textos son de ejemplo y deben revisarse antes de publicar.

## 🧱 Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL (vía Prisma ORM) |
| Auth | JWT en cookie httpOnly + bcrypt |
| Pagos | Stripe Checkout (con **modo demo** sin claves) |
| Despliegue | GitHub + Railway (API + Postgres) · Cloudflare Pages (frontend) |

## 📁 Estructura

```
nutripet/
├── client/            React + Vite (escaparate y tienda)
│   └── src/
│       ├── components/  Navbar, Footer, CartDrawer, ProductCard…
│       ├── pages/       Home, Catálogo, Producto, Checkout, Cuenta, Admin
│       ├── store/       cart (zustand) · auth (context)
│       └── lib/         api client, tipos, utilidades
└── server/            Express + Prisma
    ├── prisma/          schema.prisma · seed.ts
    └── src/
        ├── routes/      products, taxonomy, auth, checkout, orders, admin
        └── middleware/  auth (JWT)
```

## 🚀 Puesta en marcha local

Necesitas **Node 18+** y un **PostgreSQL** accesible (local o de Railway).

```bash
# 1) Instalar dependencias (client + server)
npm run install:all

# 2) Configurar el servidor
cp server/.env.example server/.env
#   → edita DATABASE_URL con tu Postgres

# 3) Crear tablas y sembrar datos de demo
npm run db:push      # crea el esquema
npm run db:seed      # ~28 productos, marcas, usuarios demo

# 4) Arrancar (dos terminales)
npm run dev:server   # API en http://localhost:4000
npm run dev:client   # Web en http://localhost:5173
```

Usuarios de demostración:
- **Admin:** `admin@nutripet.com` / `admin1234` → `/admin`
- **Cliente:** `cliente@nutripet.com` / `cliente1234`

> **Checkout sin Stripe:** si no defines `STRIPE_SECRET_KEY`, el checkout usa un **pago de demostración** que marca el pedido como pagado y te lleva a la página de confirmación. Ideal para probar el flujo completo sin configurar nada.

## ☁️ Despliegue barato (GitHub → Railway → Cloudflare)

### 1. API + PostgreSQL en Railway
1. Sube el repo a GitHub.
2. En Railway: **New Project → Deploy from GitHub**, selecciona el repo.
3. Añade un servicio **PostgreSQL** (New → Database → PostgreSQL). Railway crea `DATABASE_URL`.
4. En el servicio de la API pon **Root Directory = `server`** y variables:
   - `DATABASE_URL` → referencia a la del Postgres (`${{Postgres.DATABASE_URL}}`)
   - `JWT_SECRET`, `CLIENT_ORIGIN` (dominio del front), `PUBLIC_SITE_URL`, `NODE_ENV=production`
   - Stripe (opcional): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
5. Build: `npm install && npm run build && npx prisma migrate deploy`
   Start: `npm run start`
6. Siembra una vez: desde Railway shell `npm run db:seed`.

### 2. Frontend en Cloudflare Pages
1. Cloudflare Pages → **Connect to Git** → el mismo repo.
2. **Root directory = `client`**, Build command `npm run build`, Output `dist`.
3. Variable `VITE_API_URL` = URL pública de la API en Railway.
4. `public/_redirects` ya incluye el fallback SPA.

### Alternativa aún más simple (un solo servicio)
El servidor sirve el build del frontend en producción (`server/src/index.ts`).
Despliega solo en Railway con Root `.` y build `npm --prefix client install && npm --prefix client run build && npm --prefix server install && npm --prefix server run build && npx --prefix server prisma migrate deploy`. Migrar la BD a otro Postgres luego es trivial con Prisma.

## 🔌 API (resumen)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/taxonomy` | Animales, categorías, necesidades, marcas |
| GET | `/api/products` | Catálogo con filtros (`animal`, `category`, `brand`, `need`, `q`, `sort`, `page`) |
| GET | `/api/products/:slug` | Ficha + relacionados |
| POST | `/api/auth/register` · `/login` · `/logout` · GET `/me` | Autenticación |
| POST | `/api/checkout` | Crea pedido (Stripe o demo) |
| GET | `/api/orders/:id` · `/api/orders` | Confirmación · historial |
| * | `/api/admin/*` | CRUD productos y pedidos (solo ADMIN) |
