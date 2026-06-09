import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Users, ArrowRight, Wifi, Waves, Utensils, Sprout, Car, Wind, Star, MapPin, Navigation, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../services/storage';
import { formatCurrency } from '../lib/utils';
import { useTenant } from '../TenantContext';

export default function Home() {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const rooms = storage.getRooms().filter(r => r.featured);
  const reviews = storage.getReviews().filter(r => r.approved);
  const gallery = storage.getGallery();
  const config = storage.getConfig();

  const [search, setSearch] = useState({
    checkIn: '',
    checkOut: '',
    guests: '1'
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/habitaciones?checkIn=${search.checkIn}&checkOut=${search.checkOut}&guests=${search.guests}`);
  };

  const services = [
    { icon: Wifi, name: 'WiFi Gratis' },
    { icon: Waves, name: 'Piscina' },
    { icon: Utensils, name: 'Restaurante' },
    { icon: Sprout, name: 'Spa' },
    { icon: Car, name: 'Estacionamiento' },
    { icon: Wind, name: 'Aire Acondicionado' },
  ];

  return (
    <div className="space-y-32 pb-32">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img
            src={currentTenant?.theme?.coverUrl || "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2000"}
            alt="Hotel Hero"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-slate-900/40" />
        </div>

        <div className="relative z-10 text-center text-white px-4 max-w-5xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl sm:text-6xl md:text-8xl font-extrabold mb-8 tracking-tighter"
          >
            {currentTenant?.name || 'Lumina Hotel'}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-xl md:text-2xl mb-12 font-light text-slate-100 max-w-2xl mx-auto"
          >
            Donde el lujo encuentra su hogar. La elegancia contemporánea para una experiencia inolvidable.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link to="/reserva" className="btn-primary w-full sm:w-auto text-lg px-12">
              Reservar Ahora
            </Link>
            <Link to="/habitaciones" className="btn-secondary w-full sm:w-auto text-lg px-12 text-white border-white hover:border-white hover:bg-white/10">
              Ver Habitaciones
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Search Bar - Sophisticated */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-10 -mt-32 relative z-20">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Check-in</label>
              <input
                type="date"
                required
                className="w-full border-b-2 border-slate-200 py-3 text-lg font-medium text-slate-900 focus:border-slate-900 outline-none transition-all"
                value={search.checkIn}
                onChange={e => setSearch({...search, checkIn: e.target.value})}
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Check-out</label>
              <input
                type="date"
                required
                className="w-full border-b-2 border-slate-200 py-3 text-lg font-medium text-slate-900 focus:border-slate-900 outline-none transition-all"
                value={search.checkOut}
                onChange={e => setSearch({...search, checkOut: e.target.value})}
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Huéspedes</label>
              <select
                className="w-full border-b-2 border-slate-200 py-3 text-lg font-medium text-slate-900 focus:border-slate-900 outline-none transition-all"
                value={search.guests}
                onChange={e => setSearch({...search, guests: e.target.value})}
              >
                {[1,2,3,4,5,6].map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'Persona' : 'Personas'}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="btn-primary w-full !rounded-2xl"
            >
              Buscar
            </button>
          </form>
        </div>
      </section>

      {/* Featured Rooms */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold text-slate-950 tracking-tighter mb-4">Habitaciones Destacadas</h2>
          <p className="text-xl text-slate-500 font-light">Una selección de lo mejor para usted.</p>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-10"
        >
          {rooms.map((room) => (
            <motion.div 
              key={room.id} 
              whileHover={{ y: -10 }}
              transition={{ duration: 0.4 }}
              className="card group"
            >
              <div className="relative h-80 overflow-hidden">
                <img
                  src={room.images[0]}
                  alt={room.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md text-slate-950 px-6 py-2 rounded-full font-bold shadow-sm text-sm">
                  {formatCurrency(room.price)} <span className="font-normal text-slate-500">/ noche</span>
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold text-slate-950 mb-3 tracking-tight">{room.name}</h3>
                <p className="text-slate-600 text-sm mb-6 leading-relaxed line-clamp-3">{room.description}</p>
                <div className="flex gap-4">
                    <Link to={`/habitaciones/${room.id}`} className="btn-secondary flex-1">Detalles</Link>
                    <Link to={`/reserva?roomId=${room.id}`} className="btn-primary flex-1">Reservar</Link>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ... (keep services, gallery, reviews, location, cta - just apply the same logic if needed) */}

      {/* Gallery */}
      <section className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Galería</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {gallery.slice(0, 8).map((img) => (
            <div key={img.id} className="relative overflow-hidden rounded-xl aspect-square">
              <img src={img.url} alt={img.title} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Lo que dicen nuestros huéspedes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.slice(0, 3).map((review) => (
            <div key={review.id} className="card p-6">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-gray-600 italic mb-6">"{review.comment}"</p>
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="font-bold text-gray-900">{review.userName}</span>
                <span className="text-xs text-gray-400">{review.date}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Location */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Ubicación Privilegiada</h2>
            <p className="text-gray-600 mb-8">
              Estamos ubicados en el corazón de la ciudad, cerca de los principales centros de negocios y atracciones turísticas.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="h-5 w-5 text-[var(--color-primary)]" />
                <span>{config.address}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Navigation className="h-5 w-5 text-[var(--color-primary)]" />
                <span>A 15 min del Aeropuerto</span>
              </div>
            </div>
            <div className="mt-8 flex gap-4">
              <a 
                href="https://www.google.com/maps/dir/?api=1&destination=-12.097,-77.036" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-primary flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" /> Cómo llegar
              </a>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=-12.097,-77.036" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" /> Google Maps
              </a>
            </div>
          </div>
          <div className="h-96 rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.23456789!2d-77.036!3d-12.097!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDA1JzQ5LjIiUyA3N8KwMDInMDkuNiJX!5e0!3m2!1ses!2spe!4v1620000000000!5m2!1ses!2spe" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="relative bg-slate-950 rounded-3xl p-12 md:p-20 text-center text-white overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 opacity-90" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tighter">
              ¿Listo para su estancia exclusiva?
            </h2>
            <p className="text-lg md:text-xl mb-10 text-slate-400 font-light max-w-2xl mx-auto leading-relaxed">
              Reserve directamente a través de nuestro sitio web y disfrute de tarifas preferenciales, mejoras de suite garantizadas y servicios personalizados.
            </p>
            <Link
              to="/reserva"
              className="inline-block px-10 py-4 bg-white text-slate-950 rounded-full font-bold text-base transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-xl"
            >
              Reservar Su Estancia
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
