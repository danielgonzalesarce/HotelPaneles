import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { confirmReservationAndBlockRoom } from '../services/roomAvailability';
import { motion, AnimatePresence } from 'motion/react';

const inputClass =
  'w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 outline-none transition-all';

export default function SimulatedCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholder, setCardholder] = useState('');

  const roomName = searchParams.get('roomName') || 'Habitación';
  const price = parseFloat(searchParams.get('price') || '0');
  const totalPrice = parseFloat(searchParams.get('totalPrice') || '0');
  const reservationId = searchParams.get('reservationId') || '';
  const roomId = searchParams.get('roomId') || '';
  const source = searchParams.get('source') || 'web';
  const guestName = searchParams.get('guestName') || '';
  const balance = Math.max(totalPrice - price, 0);

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
          navigate(
            `/reserva?success=true&simulated=true&reservationId=${reservationId}&roomId=${roomId}`
          );
        }
      }, 2000);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-500">
            <Sparkles className="h-3.5 w-3.5" />
            Lumina Hotel &amp; Spa
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden flex flex-col lg:flex-row border border-slate-200/80">
          {/* Resumen */}
          <div className="lg:w-[42%] bg-[var(--color-primary)] text-white p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />

            <div className="relative space-y-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
                  Confirmar reserva
                </p>
                <h1 className="text-2xl font-bold tracking-tight">Adelanto del 10%</h1>
                <p className="text-slate-400 text-sm mt-2">
                  Complete el pago simulado para apartar su habitación.
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">A pagar ahora</p>
                <p className="text-5xl font-black tracking-tight">{formatCurrency(price)}</p>
              </div>

              <div className="space-y-3 pt-6 border-t border-white/10">
                {guestName && (
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-400">Huésped</span>
                    <span className="font-medium text-right">{guestName}</span>
                  </div>
                )}
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-400">Habitación</span>
                  <span className="font-medium text-right">{roomName}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-400">Referencia</span>
                  <span className="font-mono text-xs text-slate-300">{reservationId || '—'}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-400">Total estadía</span>
                  <span className="font-semibold">{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-400">Saldo en hotel</span>
                  <span className="font-semibold text-emerald-300">{formatCurrency(balance)}</span>
                </div>
              </div>
            </div>

            <div className="relative pt-10 space-y-3">
              <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Pago seguro · simulación académica</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                <Lock className="h-4 w-4 shrink-0" />
                <span>Conexión cifrada SSL</span>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="lg:w-[58%] p-8 lg:p-10 bg-white relative">
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="min-h-[420px] flex flex-col items-center justify-center text-center space-y-5"
                >
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center ring-8 ring-emerald-50/80">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-slate-900">¡Pago registrado!</h3>
                    <p className="text-slate-500 max-w-sm">
                      Su adelanto quedó confirmado. Le llevamos a la confirmación de reserva…
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Datos de la tarjeta</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Ingrese la información tal como figura en su tarjeta.
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200">
                        VISA
                      </span>
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200">
                        MC
                      </span>
                    </div>
                  </div>

                  <form
                    onSubmit={handlePayment}
                    className="space-y-5"
                    autoComplete="off"
                    data-form-type="other"
                  >
                    <div className="space-y-1.5">
                      <label htmlFor="card-number" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Número de tarjeta
                      </label>
                      <div className="relative">
                        <input
                          id="card-number"
                          name="card-number-sim"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="0000 0000 0000 0000"
                          className={`${inputClass} pl-11`}
                        />
                        <CreditCard className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="card-expiry" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Vencimiento
                        </label>
                        <input
                          id="card-expiry"
                          name="card-expiry-sim"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          required
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          placeholder="MM / AA"
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="card-cvc" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          CVC
                        </label>
                        <input
                          id="card-cvc"
                          name="card-cvc-sim"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          required
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value)}
                          placeholder="•••"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="cardholder" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Titular de la tarjeta
                      </label>
                      <input
                        id="cardholder"
                        name="cardholder-sim"
                        type="text"
                        autoComplete="off"
                        required
                        value={cardholder}
                        onChange={(e) => setCardholder(e.target.value)}
                        placeholder="Nombre como aparece en la tarjeta"
                        className={inputClass}
                      />
                    </div>

                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Info className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-amber-900/90 leading-relaxed">
                        <span className="font-semibold">Modo simulación.</span> Pasarela de prueba
                        Stripe para la sustentación. No se realizará ningún cargo real; puede usar
                        datos ficticios.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-4 bg-[var(--color-primary)] hover:bg-black disabled:bg-slate-400 text-white rounded-xl font-semibold text-base transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2.5"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Procesando pago…
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Pagar {formatCurrency(price)}
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-400 text-sm">
          Powered by{' '}
          <span className="font-semibold text-slate-600">Stripe</span> · simulación académica ·{' '}
          <Link to="/" className="text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
