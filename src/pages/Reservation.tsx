import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, Users, CreditCard, CheckCircle2, Info, Loader2, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';
import { storage } from '../services/storage';
import { createCheckoutSession } from '../services/checkoutService';
import { isRoomAvailableForDates, markRoomAsReserved, confirmReservationAndBlockRoom, cancelReservationAndReleaseRoom } from '../services/roomAvailability';
import { Room, Reservation } from '../types';
import { formatCurrency } from '../lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';

export default function ReservationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomId = searchParams.get('roomId');
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const simulated = searchParams.get('simulated');
  
  const [room, setRoom] = useState<Room | null>(null);
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    guests: parseInt(searchParams.get('guests') || '1'),
    extras: {
      breakfast: false,
      shuttle: false,
      extraBed: false
    }
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (canceled !== 'true') return;
    const reservationId = searchParams.get('reservationId');
    if (reservationId) {
      cancelReservationAndReleaseRoom(reservationId);
    }
  }, [canceled, searchParams]);

  useEffect(() => {
    if (success === 'true') {
      const reservationId = searchParams.get('reservationId');
      if (reservationId) {
        confirmReservationAndBlockRoom(reservationId);
      } else {
        const reservations = storage.getReservations();
        const lastPending = [...reservations].reverse().find(r => r.status === 'pending_payment');
        if (lastPending) {
          confirmReservationAndBlockRoom(lastPending.id);
        }
      }
      setSubmitted(true);
    }
  }, [success, searchParams]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      try {
        if (!isMounted) return;
        const rooms = storage.getRooms();
        const found = rooms.find(r => r.id === roomId);
        if (found) {
          setRoom(found);
        } else if (roomId) {
          console.warn(`Room with ID ${roomId} not found`);
        }
      } catch (err) {
        console.error('Error loading room data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 800);

    // Safety timeout to prevent stuck skeleton
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, [roomId]);

  const nights = formData.checkIn && formData.checkOut 
    ? Math.max(0, differenceInDays(parseISO(formData.checkOut), parseISO(formData.checkIn)))
    : 0;

  const extrasPrice = (formData.extras.breakfast ? 15 : 0) + 
                      (formData.extras.shuttle ? 30 : 0) + 
                      (formData.extras.extraBed ? 25 : 0);
  
  const totalPrice = room ? (room.price * nights) + extrasPrice : 0;
  const depositAmount = totalPrice * 0.1;
  const remainingAmount = totalPrice - depositAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    
    if (nights <= 0) {
      setError('Por favor seleccione fechas válidas de check-in y check-out.');
      return;
    }

    if (!isRoomAvailableForDates(room.id, formData.checkIn, formData.checkOut)) {
      setError('Esta habitación no está disponible para las fechas seleccionadas. Elija otras fechas u otra habitación.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    const reservationId = Math.random().toString(36).substr(2, 9);
    const newReservation: Reservation = {
      id: reservationId,
      roomId: room.id,
      roomName: `Hab. ${room.number} - ${room.name}`,
      userId: currentUser?.id || 'guest',
      userName: formData.name,
      userEmail: formData.email,
      userPhone: formData.phone,
      checkIn: formData.checkIn,
      checkOut: formData.checkOut,
      guests: formData.guests,
      totalPrice: totalPrice,
      depositPaid: depositAmount,
      remainingBalance: remainingAmount,
      status: 'pending_payment',
      extras: formData.extras,
      createdAt: new Date().toISOString()
    };

    storage.saveReservation(newReservation);
    markRoomAsReserved(room.id);

    try {
      const checkout = await createCheckoutSession({
        roomName: room.name,
        roomId: room.id,
        price: depositAmount,
        totalPrice,
        reservationId,
        source: 'web',
        guestName: formData.name,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
      });
      window.location.href = checkout.url;
    } catch (err) {
      cancelReservationAndReleaseRoom(reservationId);
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago. Intente de nuevo.');
      setIsProcessing(false);
    }
  };

  const Skeleton = () => (
    <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="w-12 h-12 bg-gray-200 rounded-full" />
          <div className="h-8 bg-gray-200 rounded-lg w-3/4" />
          <div className="h-4 bg-gray-200 rounded-lg w-1/2" />
          <div className="aspect-square bg-gray-200 rounded-3xl" />
        </div>
        <div className="space-y-6">
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="h-12 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-16 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-8">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-green-100 text-green-600 rounded-full"
        >
          <CheckCircle2 className="h-12 w-12" />
        </motion.div>
        <h1 className="text-4xl font-bold text-gray-900">¡Reserva Confirmada!</h1>
        <p className="text-xl text-gray-600">
          Su reserva ha sido procesada con éxito mediante el pago del 10% de adelanto. 
          El saldo restante deberá ser cancelado al momento de su llegada al hotel.
        </p>
        {simulated && (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm inline-block">
            Modo Demo: El pago fue simulado exitosamente.
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(currentUser ? '/user/mis-reservas' : '/')}
            className="btn-primary"
          >
            {currentUser ? 'Ver Mis Reservas' : 'Volver al Inicio'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 min-h-screen">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Skeleton />
          </motion.div>
        ) : !room ? (
          <div className="text-center py-24 space-y-6">
            <h2 className="text-2xl font-bold">Por favor seleccione una habitación primero</h2>
            <button onClick={() => navigate('/habitaciones')} className="btn-primary">Ver Habitaciones</button>
          </div>
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16"
          >
            {/* Left Column: Room Info */}
            <div className="space-y-8">
              <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors font-medium"
              >
                <ArrowLeft className="h-4 w-4" /> Volver
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{room.name}</h1>
                    <p className="text-gray-500">Habitación {room.number}</p>
                  </div>
                </div>
              </div>

              <div className="relative aspect-[4/3] rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-2xl border-4 md:border-8 border-white">
                <img 
                  src={room.images[0]} 
                  alt={room.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Precio por Noche</div>
                      <div className="text-2xl font-bold text-gray-900">{formatCurrency(room.price)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Capacidad</div>
                      <div className="flex items-center gap-1 font-bold text-gray-900">
                        <Users className="h-4 w-4" /> {room.capacity}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Check-in</div>
                  <div className="font-bold text-gray-900">{formData.checkIn || 'No seleccionado'}</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Check-out</div>
                  <div className="font-bold text-gray-900">{formData.checkOut || 'No seleccionado'}</div>
                </div>
              </div>

              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-start gap-4">
                <ShieldCheck className="h-6 w-6 text-indigo-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-indigo-900">Reserva Protegida</h4>
                  <p className="text-sm text-indigo-700">Su pago está encriptado y su reserva está garantizada por Lumina Hotel.</p>
                </div>
              </div>
            </div>

            {/* Right Column: Form & Payment */}
            <div className="bg-white p-6 md:p-12 rounded-3xl md:rounded-[3rem] shadow-xl border border-gray-100 h-fit">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900">Detalles de la Estancia</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="h-3 w-3" /> Check-in
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        value={formData.checkIn}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setFormData({...formData, checkIn: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="h-3 w-3" /> Check-out
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        value={formData.checkOut}
                        min={formData.checkIn || new Date().toISOString().split('T')[0]}
                        onChange={e => setFormData({...formData, checkOut: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Users className="h-3 w-3" /> Cantidad de Personas
                    </label>
                    <select
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none"
                      value={formData.guests}
                      onChange={e => setFormData({...formData, guests: parseInt(e.target.value)})}
                    >
                      {[...Array(room.capacity)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'Persona' : 'Personas'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900">Información del Huésped</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        placeholder="Juan Pérez"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</label>
                        <input
                          type="email"
                          required
                          placeholder="juan@ejemplo.com"
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Teléfono</label>
                        <input
                          type="tel"
                          required
                          placeholder="+51 999 999 999"
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-gray-900">Servicios Adicionales</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <label className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${formData.extras.breakfast ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                      <input
                        type="checkbox"
                        className="h-5 w-5 text-indigo-600 rounded-lg border-gray-300"
                        checked={formData.extras.breakfast}
                        onChange={e => setFormData({...formData, extras: {...formData.extras, breakfast: e.target.checked}})}
                      />
                      <div className="flex-grow">
                        <div className="font-bold text-gray-900">Desayuno Buffet</div>
                        <div className="text-xs text-gray-500">+S/ 15.00 por noche</div>
                      </div>
                    </label>
                    <label className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${formData.extras.shuttle ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                      <input
                        type="checkbox"
                        className="h-5 w-5 text-indigo-600 rounded-lg border-gray-300"
                        checked={formData.extras.shuttle}
                        onChange={e => setFormData({...formData, extras: {...formData.extras, shuttle: e.target.checked}})}
                      />
                      <div className="flex-grow">
                        <div className="font-bold text-gray-900">Transporte VIP</div>
                        <div className="text-xs text-gray-500">+S/ 30.00 pago único</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">Monto Total</span>
                      <span className="text-xl font-bold text-gray-900">{formatCurrency(totalPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <div>
                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Adelanto (10%)</div>
                        <div className="text-2xl font-black text-indigo-900">{formatCurrency(depositAmount)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pendiente</div>
                        <div className="text-lg font-bold text-gray-600">{formatCurrency(remainingAmount)}</div>
                      </div>
                    </div>
                    <p className="text-xs text-center text-gray-500 italic">
                      * Solo pagará el 10% ahora para confirmar su reserva. El resto se paga en el hotel.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Detalles de Pago</h4>
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-grow">
                          <div className="text-sm font-bold text-gray-900">Tarjeta de Crédito / Débito</div>
                          <div className="text-xs text-gray-500">Pago seguro vía Stripe</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex items-center gap-2 border border-red-100"
                    >
                      <Info className="h-4 w-4 shrink-0" /> {error}
                    </motion.div>
                  )}

                  {canceled === 'true' && !error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-amber-50 text-amber-600 rounded-2xl text-sm flex items-center gap-2 border border-amber-100"
                    >
                      <Info className="h-4 w-4 shrink-0" /> Pago cancelado. Intente de nuevo si desea completar su reserva.
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-[2rem] font-bold text-xl transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3 relative overflow-hidden group"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" /> 
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-6 w-6" />
                        <span>Pagar Adelanto (10%)</span>
                        <Zap className="h-4 w-4 text-yellow-400 absolute right-8 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </>
                    )}
                  </button>
                  
                  <div className="flex items-center justify-center gap-6 opacity-40 grayscale">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4" />
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
