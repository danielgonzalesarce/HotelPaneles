import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Users, Wifi, Wind, Coffee, Tv, Shield, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../services/storage';
import { Room } from '../types';
import { formatCurrency } from '../lib/utils';

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const found = storage.getRooms().find(r => r.id === id);
    if (found) {
      setRoom(found);
    } else {
      navigate('/habitaciones');
    }
  }, [id, navigate]);

  if (!room) return null;

  const nextImage = () => setActiveImage((prev) => (prev + 1) % room.images.length);
  const prevImage = () => setActiveImage((prev) => (prev - 1 + room.images.length) % room.images.length);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link to="/habitaciones" className="inline-flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-medium mb-8 transition-colors">
        <ChevronLeft className="h-5 w-5" /> Volver a habitaciones
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Galería */}
        <div className="space-y-4">
          <div className="relative h-64 md:h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImage}
                src={room.images[activeImage]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </AnimatePresence>
            <button 
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full transition-all"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 backdrop-blur-md hover:bg-white/40 text-white rounded-full transition-all"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {room.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`h-24 rounded-2xl overflow-hidden border-4 transition-all ${
                  activeImage === i ? 'border-indigo-600 scale-95' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-indigo-100 text-indigo-700 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                {room.type}
              </span>
              {room.featured && (
                <span className="bg-amber-100 text-amber-700 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  Destacada
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Habitación {room.number}: {room.name}</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              {room.description}
            </p>
          </div>

          <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-gray-500 text-sm block mb-1">Precio por noche</span>
                <span className="text-4xl font-bold text-indigo-600">{formatCurrency(room.price)}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 text-sm block mb-1">Capacidad Máxima</span>
                <span className="text-xl font-bold text-gray-900 flex items-center justify-end gap-2">
                  <Users className="h-5 w-5" /> {room.capacity} Personas
                </span>
              </div>
            </div>
            <Link
              to={`/reserva?roomId=${room.id}`}
              className="block w-full text-center py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xl transition-all shadow-xl shadow-indigo-200"
            >
              Reservar ahora
            </Link>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">¿Qué incluye esta habitación?</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              {room.amenities.map((amenity, i) => (
                <div key={i} className="flex items-center gap-3 text-gray-700">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{amenity}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-gray-700">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">Servicio al cuarto 24/7</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">Limpieza diaria</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
