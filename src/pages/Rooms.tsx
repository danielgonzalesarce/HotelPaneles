import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users, Wifi, Wind, Shield, Search, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../services/storage';
import { getUnavailableRoomIds } from '../services/roomAvailability';
import { Room, RoomType } from '../types';
import { formatCurrency } from '../lib/utils';

export default function Rooms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');

  useEffect(() => {
    setRooms(storage.getRooms());
  }, []);

  const unavailableIds = useMemo(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return new Set<string>();
    return new Set(getUnavailableRoomIds(checkIn, checkOut));
  }, [checkIn, checkOut]);

  const updateDates = (inDate: string, outDate: string) => {
    setCheckIn(inDate);
    setCheckOut(outDate);
    const next = new URLSearchParams(searchParams);
    if (inDate) next.set('checkIn', inDate);
    else next.delete('checkIn');
    if (outDate) next.set('checkOut', outDate);
    else next.delete('checkOut');
    setSearchParams(next, { replace: true });
  };

  const filteredRooms = rooms.filter(room => {
    const matchesType = filter === 'all' || room.type === filter;
    const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         room.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCapacity = room.capacity >= minCapacity;
    
    return matchesType && matchesSearch && matchesCapacity;
  });

  const types = [
    { id: 'all', name: 'Todas' },
    { id: RoomType.Standard, name: 'Estándar' },
    { id: RoomType.Double, name: 'Doble' },
    { id: RoomType.Suite, name: 'Suite' },
    { id: RoomType.PremiumSuite, name: 'Premium' },
  ];

  const capacities = [0, 1, 2, 3, 4];

  return (
    <div className="w-full">
      <div className="relative w-full h-[500px] mb-12 shadow-2xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=80"
          alt="Luxury Bedroom"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center space-y-3 px-4 drop-shadow-lg pt-20">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter">Nuestras Habitaciones</h1>
          <p className="text-slate-100 font-light text-xl md:text-2xl max-w-2xl mx-auto">
            El refugio perfecto diseñado para su confort exclusivo.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="md:w-72 flex-shrink-0">
          <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 sticky top-24 z-30 space-y-8">
            {/* Dates */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Disponibilidad
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={checkIn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => updateDates(e.target.value, checkOut)}
                />
                <input
                  type="date"
                  className="w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={checkOut}
                  min={checkIn || new Date().toISOString().split('T')[0]}
                  onChange={(e) => updateDates(checkIn, e.target.value)}
                />
              </div>
              {checkIn && checkOut && checkOut > checkIn && (
                <p className="text-[11px] text-slate-500 mt-2">
                  Mostrando disponibilidad del {checkIn} al {checkOut}
                </p>
              )}
            </div>

            {/* Search */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-slate-200 outline-none transition-all placeholder:text-slate-400 text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Tipo</label>
              <div className="flex flex-col gap-2">
                {types.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setFilter(type.id)}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                      filter === type.id 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Capacity */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Capacidad</label>
              <div className="grid grid-cols-5 gap-2">
                {capacities.map(cap => (
                  <button
                    key={cap}
                    onClick={() => setMinCapacity(cap)}
                    className={`h-10 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                      minCapacity === cap
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cap === 0 ? 'Tod' : cap + '+'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* List */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRooms.map((room) => {
              const isUnavailable = unavailableIds.has(room.id);
              const reserveParams = new URLSearchParams({ roomId: room.id });
              if (checkIn) reserveParams.set('checkIn', checkIn);
              if (checkOut) reserveParams.set('checkOut', checkOut);

              return (
              <motion.div
                key={room.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`bg-white rounded-3xl p-3 border shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col group ${
                  isUnavailable ? 'border-amber-200 opacity-90' : 'border-slate-100'
                }`}
              >
                <div className="relative h-64 overflow-hidden rounded-2xl">
                  <img
                    src={room.images[0]}
                    alt={room.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isUnavailable ? 'grayscale-[30%]' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-slate-100 shadow-sm">
                    {room.type}
                  </div>
                  {isUnavailable && (
                    <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
                      No disponible
                    </div>
                  )}
                </div>
                <div className="p-4 flex-grow flex flex-col items-center text-center">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{room.name}</h3>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {formatCurrency(room.price)} <span className="text-xs font-normal text-slate-500">/ noche</span>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm mb-6 line-clamp-2">
                    {room.description}
                  </p>
                  
                  <div className="mt-auto grid grid-cols-2 gap-3 mb-6 border-t border-slate-100 pt-4 w-full">
                    <div className="flex flex-col items-center gap-1 text-xs text-slate-500 font-medium">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>{room.capacity} Pers</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-xs text-slate-500 font-medium">
                      <Wifi className="h-4 w-4 text-slate-400" />
                      <span>WiFi</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-xs text-slate-500 font-medium">
                      <Wind className="h-4 w-4 text-slate-400" />
                      <span>Aire</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-xs text-slate-500 font-medium">
                      <Shield className="h-4 w-4 text-slate-400" />
                      <span>Segur.</span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full">
                    <Link
                      to={`/habitaciones/${room.id}`}
                      className="btn-secondary flex-1 text-center py-2 text-sm"
                    >
                      Detalles
                    </Link>
                    <Link
                      to={`/reserva?${reserveParams.toString()}`}
                      className={`btn-primary flex-1 text-center py-2 text-sm ${isUnavailable ? 'pointer-events-none opacity-50' : ''}`}
                      aria-disabled={isUnavailable}
                      onClick={(e) => isUnavailable && e.preventDefault()}
                    >
                      {isUnavailable ? 'Ocupada' : 'Reservar'}
                    </Link>
                  </div>
                </div>
              </motion.div>
            );})}
            
            {filteredRooms.length === 0 && (
              <div className="col-span-full text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Sin Resultados</h3>
                <p className="text-slate-500">No encontramos habitaciones que coincidan con su búsqueda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
