# Lumina Hotel & Spa

Sistema de gestión hotelera con sitio público, reservas, recepcionista IA (Valentina), paneles de usuario/administrador/super admin y facturación electrónica SUNAT simulada.

## Requisitos

- Node.js 20+
- npm 10+

## Desarrollo local

1. Instalar dependencias:

```bash
npm install
```

2. Copiar variables de entorno:

```bash
copy .env.example .env.local
```

Configurar al menos `GEMINI_API_KEY` en `.env.local`.

3. Iniciar servidor (frontend + API en puerto 3000):

```bash
npm run dev
```

> **Windows:** si la ruta del proyecto contiene `&`, use el script tal cual (`npm run dev` ya invoca `tsx` directamente).

Health check: `GET http://localhost:3000/api/health`

## Producción

1. Configurar `.env.local` (o variables del hosting) con claves reales y `APP_URL` apuntando al dominio público.

2. Compilar frontend y arrancar servidor Express:

```bash
npm run build
npm start
```

El comando `npm start` sirve la carpeta `dist/` y expone las APIs bajo `/api/*`. Las rutas del SPA (React Router) redirigen a `index.html`.

### Variables importantes en producción

| Variable | Descripción |
|----------|-------------|
| `GEMINI_API_KEY` | IA del recepcionista |
| `APP_URL` | URL pública (Stripe, OAuth) |
| `STRIPE_SECRET_KEY` | Pagos reales (opcional) |
| `VITE_SUPABASE_*` | Persistencia en Supabase |
| `N8N_WEBHOOK_URL` | Proxy n8n para Valentina (opcional) |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con Vite HMR + API |
| `npm run build` | Build estático en `dist/` |
| `npm start` | Servidor producción (requiere `build`) |
| `npm run lint` | Verificación TypeScript |
| `npm test` | Tests unitarios (Vitest) |

## Estructura de rutas

| Ruta | Acceso |
|------|--------|
| `/` | Público |
| `/habitaciones`, `/reserva`, `/contacto` | Público |
| `/login` | Autenticación |
| `/user/*` | Rol `user` |
| `/admin/*` | Rol `admin` |
| `/superadmin/*` | Rol `super_admin` |

Las rutas están centralizadas en `src/routes/` con lazy loading y guards por rol.

## Supabase (opcional)

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar `supabase/schema.sql`
3. Añadir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
4. Google OAuth: ver `supabase/google-auth-setup.md`

## n8n (opcional)

Workflow de referencia: `n8n-valentina-workflow.json`. Webhook → `POST /api/receptionist/chat`.

## Credenciales demo (localStorage)

- Super Admin: `superadmin@empresa.com` / `super`
- Admin: `admin@hotel.com` / `admin`
