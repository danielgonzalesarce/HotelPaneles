/** Rutas públicas y paneles — única fuente de verdad para navegación. */
export const ROUTES = {
  home: '/',
  rooms: '/habitaciones',
  room: (id: string) => `/habitaciones/${id}`,
  reservation: '/reserva',
  reviews: '/reseñas',
  contact: '/contacto',
  login: '/login',
  authCallback: '/auth/callback',
  complaints: '/reclamaciones',
  legal: '/legal',
  checkout: '/checkout',
  checkoutSimulated: '/checkout-simulado',
  user: {
    root: '/user',
    reservations: '/user/mis-reservas',
    profile: '/user/perfil',
  },
  admin: {
    root: '/admin',
    rooms: '/admin/habitaciones',
    calendar: '/admin/calendario',
    control: '/admin/control',
    billing: '/admin/facturacion',
    reports: '/admin/reportes',
    gallery: '/admin/galeria',
    complaints: '/admin/reclamaciones',
    reviews: '/admin/reseñas',
    config: '/admin/configuracion',
  },
  superAdmin: {
    root: '/superadmin',
    tenants: '/superadmin/empresas',
    billing: '/superadmin/facturacion',
    config: '/superadmin/configuracion',
  },
} as const;

/** Alias legacy → ruta canónica */
export const LEGACY_REDIRECTS: Record<string, string> = {
  '/reservacion': ROUTES.reservation,
  '/resenas': ROUTES.reviews,
  '/checkout': ROUTES.checkoutSimulated,
};

export function isPanelPath(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/user')
  );
}

export function isAuthPath(pathname: string): boolean {
  return pathname === ROUTES.login || pathname === ROUTES.authCallback;
}
