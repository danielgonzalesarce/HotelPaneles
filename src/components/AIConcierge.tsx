import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  UserCircle,
  X,
  Send,
  Loader2,
  Minimize2,
  Maximize2,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { receptionistService, resetReceptionistSession } from '../services/receptionistService';
import { confirmReservationAndBlockRoom, cancelReservationAndReleaseRoom } from '../services/roomAvailability';
import {
  RECEPTIONIST_QUICK_ACTIONS,
  RECEPTIONIST_WELCOME,
  RECEPTIONIST_NAME,
  RECEPTIONIST_TITLE,
} from '../lib/receptionistActions';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

function createMessage(role: Message['role'], text: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    text,
    timestamp: Date.now(),
  };
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2 max-w-[88%]">
        <div className="h-8 w-8 rounded-full bg-indigo-700 flex items-center justify-center shrink-0 shadow-md ring-2 ring-white">
          <UserCircle className="h-5 w-5 text-white" />
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
            <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">{RECEPTIONIST_NAME} está escribiendo…</p>
        </div>
      </div>
    </div>
  );
}

export default function AIConcierge() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    createMessage('model', RECEPTIONIST_WELCOME),
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const paymentSuccessHandled = useRef(false);
  const paymentCancelHandled = useRef(false);

  const markdownComponents = {
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="mb-0.5">{children}</li>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-bold">{children}</strong>
    ),
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      const isPayment = href?.includes('checkout') || href?.includes('stripe.com');
      const isInternal = href?.startsWith('/');

      if (isInternal && href) {
        return (
          <Link
            to={href}
            className="inline-flex items-center gap-1 text-indigo-600 underline font-semibold hover:text-indigo-800"
            onClick={() => setIsOpen(false)}
          >
            {children}
          </Link>
        );
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 font-semibold break-all transition-colors ${
            isPayment
              ? 'mt-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white no-underline hover:bg-stone-800 shadow-md'
              : 'text-indigo-600 underline hover:text-indigo-800'
          }`}
        >
          {children}
          {!isPayment && <ExternalLink className="h-3 w-3 shrink-0" />}
        </a>
      );
    },
  };

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const clearChatParams = useCallback(
    (keys: string[]) => {
      const next = new URLSearchParams(searchParams);
      keys.forEach((k) => next.delete(k));
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    if (searchParams.get('chat') === 'open') {
      setIsOpen(true);
      setIsMinimized(false);
      clearChatParams(['chat']);
    }
  }, [searchParams, clearChatParams]);

  useEffect(() => {
    if (paymentSuccessHandled.current) return;
    if (searchParams.get('chatPaymentSuccess') !== 'true') return;

    paymentSuccessHandled.current = true;
    const reservationId = searchParams.get('reservationId') || '';
    const roomName = searchParams.get('roomName') || 'su habitación';
    const guestName = searchParams.get('guestName') || 'estimado huésped';

    if (reservationId) {
      confirmReservationAndBlockRoom(reservationId);
    }

    setIsOpen(true);
    setIsMinimized(false);
    setMessages((prev) => [
      ...prev,
      createMessage(
        'model',
        `Perfecto, **${guestName}**, ya registré su pago del adelanto.

Su reserva en **${roomName}** quedó confirmada (ID: \`${reservationId}\`). La habitación está apartada para sus fechas.

¡Le esperamos en Lumina! Cualquier cosa, escríbame por aquí.`
      ),
    ]);

    clearChatParams(['chatPaymentSuccess', 'reservationId', 'roomName', 'guestName', 'chat']);
  }, [searchParams, clearChatParams]);

  useEffect(() => {
    if (paymentCancelHandled.current) return;
    if (searchParams.get('chatPaymentCanceled') !== 'true') return;

    paymentCancelHandled.current = true;
    const reservationId = searchParams.get('reservationId') || '';

    if (reservationId) {
      cancelReservationAndReleaseRoom(reservationId);
    }

    setIsOpen(true);
    setIsMinimized(false);
    setMessages((prev) => [
      ...prev,
      createMessage(
        'model',
        'Entendido, canceló el pago. Liberé la habitación en el sistema. Si desea intentar de nuevo o cambiar fechas, con gusto le ayudo.'
      ),
    ]);

    clearChatParams(['chatPaymentCanceled', 'reservationId', 'chat']);
  }, [searchParams, clearChatParams]);

  useEffect(() => {
    if (!isOpen || isMinimized) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    inputRef.current?.focus();

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isMinimized]);

  const showQuickActions =
    !isLoading && messages.length <= 2 && messages[messages.length - 1]?.role === 'model';

  const handleReset = () => {
    resetReceptionistSession();
    setMessages([createMessage('model', RECEPTIONIST_WELCOME)]);
    setIsMinimized(false);
    inputRef.current?.focus();
  };

  const handleSend = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string') e.preventDefault();
    const userMessage = typeof e === 'string' ? e : input.trim();
    if (!userMessage || isLoading) return;

    if (typeof e !== 'string') setInput('');
    const userMsg = createMessage('user', userMessage);
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const minDelay = new Promise((r) => setTimeout(r, 600 + Math.random() * 800));

    try {
      const chatHistory = [...messages, userMsg].map((m) => ({
        role: m.role === 'model' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      }));
      const [response] = await Promise.all([
        receptionistService.sendMessage(userMessage, chatHistory),
        minDelay,
      ]);
      setMessages((prev) => [
        ...prev,
        createMessage('model', response.text || 'Un momento, ¿puede repetir su consulta?'),
      ]);
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : 'Tuve un inconveniente de conexión.';
      setMessages((prev) => [
        ...prev,
        createMessage(
          'model',
          `${errorText} Puede llamarnos a recepción o intentar de nuevo en unos segundos.`
        ),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const openChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  return (
    <div className="fixed z-50 flex flex-col items-end bottom-20 sm:bottom-6 right-4 sm:right-6 max-sm:left-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 64 : undefined,
            }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`bg-white shadow-2xl border border-slate-200/80 overflow-hidden mb-3 flex flex-col w-full sm:w-[min(100vw-2rem,400px)] ${
              isMinimized
                ? 'h-16 rounded-2xl'
                : 'h-[min(78vh,560px)] rounded-3xl max-sm:rounded-2xl max-sm:h-[min(72vh,520px)]'
            }`}
          >
            <div className="bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 px-4 py-3.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 ring-2 ring-emerald-400/80">
                  <UserCircle className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm truncate">{RECEPTIONIST_NAME}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                    <span className="text-[10px] text-slate-300 uppercase tracking-wider font-medium truncate">
                      {RECEPTIONIST_TITLE}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reiniciar conversación"
                  aria-label="Reiniciar conversación"
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  title={isMinimized ? 'Expandir' : 'Minimizar'}
                  aria-label={isMinimized ? 'Expandir chat' : 'Minimizar chat'}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Cerrar"
                  aria-label="Cerrar chat"
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 min-h-0 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-50 to-white"
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'model' && (
                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mr-2 mt-1 shadow-sm ring-1 ring-slate-200">
                          <UserCircle className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm ${
                          msg.role === 'user'
                            ? 'bg-[var(--color-primary)] text-white rounded-br-md shadow-md shadow-indigo-200/50'
                            : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md shadow-sm'
                        }`}
                      >
                        <ReactMarkdown components={markdownComponents}>{msg.text}</ReactMarkdown>
                        <time
                          className={`block text-[9px] mt-1.5 ${
                            msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>
                    </div>
                  ))}

                  {isLoading && <TypingIndicator />}

                  {showQuickActions && (
                    <div className="pt-1 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
                        Acciones rápidas
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {RECEPTIONIST_QUICK_ACTIONS.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.id}
                              type="button"
                              onClick={() => handleSend(action.message)}
                              className="inline-flex items-center gap-1.5 text-xs bg-white border border-indigo-100 text-indigo-700 px-3 py-2 rounded-full hover:bg-indigo-50 hover:border-indigo-200 transition-all font-medium shadow-sm active:scale-95"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleSend}
                  className="p-3 sm:p-4 bg-white border-t border-slate-100 flex gap-2 shrink-0"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escriba su mensaje a recepción…"
                    aria-label="Mensaje para recepción"
                    className="flex-1 min-w-0 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    aria-label="Enviar mensaje"
                    className="p-2.5 bg-[var(--color-primary)] text-white rounded-xl hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200/80 shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openChat())}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Cerrar chat de recepción' : 'Abrir chat con recepción'}
        className={`rounded-full shadow-2xl transition-colors flex items-center gap-2 ${
          isOpen
            ? 'p-3.5 bg-white text-[var(--color-primary)] border border-gray-200'
            : 'pl-4 pr-5 py-3.5 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]'
        }`}
      >
        <UserCircle className="h-6 w-6 shrink-0" />
        {!isOpen && (
          <span className="font-semibold text-sm whitespace-nowrap">Recepción en línea</span>
        )}
      </motion.button>
    </div>
  );
}
