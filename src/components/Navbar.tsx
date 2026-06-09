import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Hotel } from 'lucide-react';
import { useTenant } from '../TenantContext';
import { useAuth } from '../AuthContext';
import { getDashboardPathForRole } from '../services/authService';

const HERO_OVERLAY_ROUTES = ['/', '/habitaciones', '/reseñas', '/resenas', '/contacto', '/login', '/reclamaciones', '/legal'];

function isHeroOverlayPage(pathname: string): boolean {
  const path = decodeURIComponent(pathname).toLowerCase();
  if (HERO_OVERLAY_ROUTES.includes(path)) return true;
  if (path.startsWith('/habitaciones/')) return false;
  return false;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, signOut } = useAuth();
  const { currentTenant } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  const atTop = !isScrolled;
  const onHero = isHeroOverlayPage(location.pathname);
  const lightText = atTop && onHero;

  const navSurfaceClass = atTop
    ? onHero
      ? 'bg-slate-950/55 backdrop-blur-md border-white/10 shadow-none'
      : 'bg-white/90 backdrop-blur-md border-slate-100 shadow-sm'
    : 'bg-white/95 backdrop-blur-md border-slate-100 shadow-sm';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setIsScrolled(false);
    setIsOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Habitaciones', path: '/habitaciones' },
    { name: 'Reseñas', path: '/reseñas' },
    { name: 'Contacto', path: '/contacto' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${navSurfaceClass}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              {currentTenant?.theme?.logoUrl ? (
                <img src={currentTenant.theme.logoUrl} alt={currentTenant.name} className="h-8 w-auto object-contain" />
              ) : (
                <Hotel
                  className={`h-7 w-7 ${lightText ? 'text-white' : 'text-slate-900'} group-hover:scale-110 transition-transform`}
                />
              )}
              <span className={`text-lg font-bold tracking-tighter ${lightText ? 'text-white' : 'text-slate-950'}`}>
                {currentTenant?.name || 'Lumina Hotel & Spa'}
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-semibold tracking-wide transition-all ${
                  lightText
                    ? location.pathname === link.path
                      ? 'text-white'
                      : 'text-white/70 hover:text-white'
                    : location.pathname === link.path
                      ? 'text-slate-950'
                      : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {currentUser ? (
              <div
                className={`flex items-center space-x-4 pl-4 border-l ${
                  lightText ? 'border-white/20' : 'border-slate-200'
                }`}
              >
                <Link
                  to={getDashboardPathForRole(currentUser.role)}
                  className={`flex items-center space-x-2 text-sm font-semibold transition-colors ${
                    lightText ? 'text-white/90 hover:text-white' : 'text-slate-900 hover:text-slate-600'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>{currentUser.name.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className={`p-2 transition-colors ${
                    lightText ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-slate-900'
                  }`}
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
                  lightText
                    ? 'text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                    : 'text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Acceder
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-md focus:outline-none ${
                lightText ? 'text-white hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label="Menú"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-lg">
          <div className="px-4 pt-4 pb-8 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className="block text-base font-medium text-gray-600 hover:text-slate-900"
              >
                {link.name}
              </Link>
            ))}
            {currentUser ? (
              <>
                <Link
                  to={getDashboardPathForRole(currentUser.role)}
                  onClick={() => setIsOpen(false)}
                  className="block text-base font-medium text-gray-600"
                >
                  Mi Panel
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="block w-full text-left text-base font-medium text-red-500"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block text-base font-medium text-slate-900"
              >
                Acceder
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
