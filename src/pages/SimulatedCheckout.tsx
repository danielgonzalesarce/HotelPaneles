import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, Lock, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { confirmReservationAndBlockRoom } from '../services/roomAvailability';
import { motion, AnimatePresence } from 'motion/react';

export default function SimulatedCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const roomName = searchParams.get('roomName') || 'Habitación';
  const price = parseFloat(searchParams.get('price') || '0');
  const totalPrice = parseFloat(searchParams.get('totalPrice') || '0');
  const reservationId = searchParams.get('reservationId') || '';
  const roomId = searchParams.get('roomId') || '';
  const source = searchParams.get('source') || 'web';
  const guestName = searchParams.get('guestName') || '';

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      if (reservationId) {
        confirmReservationAndBlockRoom(reservationId);
      }

      setIsProcessing(false);
      setIsSuccess(true);

      setTimeout(() => {
        if (source === 'chat') {
          const params = new URLSearchParams({
            chat: 'open',
            chatPaymentSuccess: 'true',
            reservationId,
            roomName,
            guestName: guestName || 'Huésped',
          });
          navigate(`/?${params.toString()}`);
        } else {
          navigate(`/reserva?success=true&simulated=true&reservationId=${reservationId}&roomId=${roomId}`);
        }
      }, 2000);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        
        {/* Left Side: Order Summary */}
        <div className="w-full md:w-5/12 bg-indigo-600 p-6 md:p-12 text-white flex flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center gap-2 opacity-80">
              <ArrowLeft className="h-4 w-4 cursor-pointer" onClick={() => navigate(-1)} />
              <span className="text-sm font-medium">Volver a Lumina Hotel</span>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-indigo-200 text-sm font-bold uppercase tracking-widest">Pagar Adelanto (10%)</h2>
              <div className="text-5xl font-black">{formatCurrency(price)}</div>
            </div>

            <div className="space-y-4 pt-8 border-t border-indigo-500/30">
              <div className="flex justify-between items-center">
                <span className="text-indigo-200 text-sm">Habitación</span>
                <span className="font-bold">{roomName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-200 text-sm">ID Reserva</span>
                <span className="font-mono text-xs">{reservationId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-200 text-sm">Total Estancia</span>
                <span className="font-bold">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-200 text-sm">Saldo Pendiente</span>
                <span className="font-bold">{formatCurrency(totalPrice - price)}</span>
              </div>
            </div>
          </div>

          <div className="pt-12 space-y-4">
            <div className="flex items-center gap-3 text-indigo-200 text-xs">
              <ShieldCheck className="h-4 w-4" />
              <span>Pago Seguro Protegido por Lumina</span>
            </div>
            <div className="flex items-center gap-3 text-indigo-200 text-xs">
              <Lock className="h-4 w-4" />
              <span>Encriptación SSL de 256 bits</span>
            </div>
          </div>
        </div>

        {/* Right Side: Payment Form */}
        <div className="w-full md:w-7/12 p-6 md:p-12 bg-white relative">
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900">¡Pago Exitoso!</h3>
                  <p className="text-gray-500">Redirigiendo a su confirmación de reserva...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-gray-900">Información de Pago</h3>
                  <div className="flex gap-2">
                    <div className="w-8 h-5 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-2" />
                    </div>
                    <div className="w-8 h-5 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-3" />
                    </div>
                  </div>
                </div>

                <form onSubmit={handlePayment} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Número de Tarjeta</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        placeholder="4242 4242 4242 4242"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all pl-12"
                        defaultValue="4242 4242 4242 4242"
                      />
                      <CreditCard className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Vencimiento</label>
                      <input 
                        type="text" 
                        required
                        placeholder="MM / YY"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        defaultValue="12 / 26"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">CVC</label>
                      <input 
                        type="text" 
                        required
                        placeholder="123"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        defaultValue="123"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Titular de la Tarjeta</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nombre como aparece en la tarjeta"
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                      <Loader2 className="h-4 w-4" />
                    </div>
                    <div className="text-xs text-amber-800 leading-relaxed">
                      <span className="font-bold">Modo Simulación:</span> Pasarela de prueba Stripe. No se realizará ningún cargo real. Use cualquier dato para continuar.
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Procesando Pago...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-5 w-5" />
                        <span>Pagar {formatCurrency(price)}</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <p className="mt-8 text-gray-400 text-sm flex items-center gap-2">
        Powered by <span className="font-bold text-gray-600">Stripe</span> (Simulated)
      </p>
    </div>
  );
}
