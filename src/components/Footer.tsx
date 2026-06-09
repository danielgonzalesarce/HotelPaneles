import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Phone, MapPin, BookOpen } from 'lucide-react';
import { storage } from '../services/storage';

export default function Footer() {
  const config = storage.getConfig();

  return (
    <footer className="bg-slate-950 text-slate-400 pt-24 pb-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
          <div className="md:col-span-4 space-y-6">
            <h3 className="text-2xl font-bold text-white tracking-tighter">Lumina Hotel & Spa</h3>
            <p className="text-sm leading-relaxed text-slate-500">
              Donde la elegancia atemporal encuentra el confort absoluto. Su retiro exclusivo en el epicentro de la ciudad.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" aria-label="Facebook" className="text-slate-600 hover:text-white transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Instagram" className="text-slate-600 hover:text-white transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Twitter" className="text-slate-600 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Explora</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Inicio</Link></li>
              <li><Link to="/habitaciones" className="hover:text-white transition-colors">Habitaciones</Link></li>
              <li><Link to="/reseñas" className="hover:text-white transition-colors">Reseñas</Link></li>
              <li><Link to="/contacto" className="hover:text-white transition-colors">Contacto</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/legal#seguridad" className="hover:text-white transition-colors">Seguridad</Link></li>
              <li><Link to="/legal#terminos" className="hover:text-white transition-colors">Términos</Link></li>
              <li className="pt-2">
                <Link to="/reclamaciones" className="group flex items-center gap-3 text-slate-500 hover:text-white transition-colors">
                  <BookOpen className="h-5 w-5 group-hover:text-white transition-colors" />
                  <span className="text-sm">Libro de Reclamaciones</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Contacto</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-slate-700 shrink-0" />
                <span className="text-slate-500">{config.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-slate-700 shrink-0" />
                <a href={`tel:${config.phone.replace(/\s/g, '')}`} className="text-slate-500 hover:text-white transition-colors">
                  {config.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-20 pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center text-slate-600 text-xs tracking-widest uppercase">
          <p>&copy; {new Date().getFullYear()} Lumina Hotel & Spa. Todos los derechos reservados.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link to="/legal" className="hover:text-white transition-colors">Privacidad</Link>
            <Link to="/legal#terminos" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
