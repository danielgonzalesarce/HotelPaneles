# Google OAuth con Supabase — Lumina Hotel & Spa

Sigue estos pasos **una sola vez** para habilitar “Iniciar sesión con Google”.

## 1. Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto (o usa uno existente)
3. **APIs & Services → OAuth consent screen**
   - Tipo: External (o Internal si tienes Google Workspace)
   - App name: `Lumina Hotel & Spa`
   - Email de soporte: tu correo
   - Guarda
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Lumina Supabase Auth`
   - **Authorized redirect URIs** (importante):
     ```
     https://lntuqjqaimdhjtztncma.supabase.co/auth/v1/callback
     ```
   - Copia **Client ID** y **Client Secret**

## 2. Supabase Dashboard

1. Abre tu proyecto **lumina-hotel-spa**
2. **Authentication → Providers → Google**
   - Enable Google
   - Pega **Client ID** y **Client Secret** de Google
   - Guarda
3. **Authentication → URL Configuration**
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs** (agregar):
     ```
     http://localhost:3000/auth/callback
     ```
   - Guarda

> En producción, agrega también tu dominio real, por ejemplo:
> `https://tudominio.com/auth/callback`

## 3. Probar en local

1. Asegúrate de tener en `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://lntuqjqaimdhjtztncma.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```
2. Reinicia el servidor
3. Ve a `http://localhost:3000/login`
4. Clic en **Iniciar sesión con Google**

## Comportamiento

- Google se abre en una **ventana emergente** centrada; la página de login muestra un overlay mientras completas el acceso.
- Si el navegador bloquea popups, permite ventanas emergentes para `localhost`.
- La primera vez que un usuario entra con Google se crea su perfil en la tabla `users`.
- Roles por correo (Google y login local):
  - `daniel.gonzales.a@tecsup.edu.pe` → Super Admin (`/superadmin`)
  - `alexanderarcedaniel@gmail.com` → Admin (`/admin`)
  - Cualquier otro correo → Huésped (`/user`)
- Los admins demo (`admin@hotel.com`, `superadmin@empresa.com`) siguen pudiendo usar email/contraseña local.
- Cerrar sesión invalida la sesión de Supabase y limpia el usuario local.

## Solución de problemas

| Error | Solución |
|-------|----------|
| `redirect_uri_mismatch` | Verifica la URI en Google Cloud: debe ser exactamente `https://TU-PROYECTO.supabase.co/auth/v1/callback` |
| Vuelve a login con `?error=google` | Revisa Redirect URLs en Supabase y que Google provider esté activo |
| No aparece botón Google | Falta `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY` en `.env.local` |
