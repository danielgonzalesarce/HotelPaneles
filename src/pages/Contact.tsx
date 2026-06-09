import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle, Facebook, Instagram } from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../services/storage';
import { useToast } from '../context/ToastContext';

export default function Contact() {
  const { showToast } = useToast();
  const config = storage.getConfig();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('¡Mensaje enviado! Nos pondremos en contacto pronto.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="w-full">
      <div className="relative w-full h-[400px] mb-12 shadow-2xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=80"
          alt="Lobby de lujo"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center space-y-3 px-4 drop-shadow-lg pt-20">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter">Contáctenos</h1>
          <p className="text-slate-100 font-light text-xl md:text-2xl max-w-2xl mx-auto">
            Estamos aquí para asistirle en todo momento. Su comodidad es nuestra prioridad.
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Info de contacto */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">Información de Contacto</h3>
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-50 text-[var(--color-primary)] rounded-2xl">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Dirección</div>
                <div className="text-sm text-slate-500">{config.address}</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-50 text-[var(--color-primary)] rounded-2xl">
                <Phone className="h-6 w-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Teléfono</div>
                <div className="text-sm text-slate-500">{config.phone}</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-50 text-[var(--color-primary)] rounded-2xl">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Email</div>
                <div className="text-sm text-slate-500">{config.email}</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-50 text-green-600 rounded-2xl">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <div className="font-bold text-slate-900">WhatsApp</div>
                <div className="text-sm text-slate-500">+{config.whatsapp}</div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-primary)] text-white p-8 rounded-2xl shadow-xl space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-4 tracking-tight">Horario de Atención</h3>
              <div className="space-y-2 text-slate-200 text-sm font-medium">
                <div className="flex justify-between">
                  <span>Recepción:</span>
                  <span className="font-bold text-white">24 Horas</span>
                </div>
                <div className="flex justify-between">
                  <span>Administración:</span>
                  <span>Lun - Vie, 9am - 6pm</span>
                </div>
                <div className="flex justify-between">
                  <span>Restaurante:</span>
                  <span>Diario, 7am - 11pm</span>
                </div>
              </div>
            </div>

            {(config.facebook || config.instagram) && (
              <div className="pt-6 border-t border-white/20">
                <h4 className="text-xs font-bold mb-4 uppercase tracking-wider text-slate-300">Síguenos</h4>
                <div className="flex gap-4">
                  {config.facebook && (
                    <a href={config.facebook} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {config.instagram && (
                    <a href={config.instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Formulario */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-10 md:p-12 rounded-3xl border border-slate-100 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Nombre</label>
                <input
                  type="text"
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                  placeholder="Su nombre..."
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                  placeholder="ejemplo@correo.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Asunto</label>
              <input
                type="text"
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                placeholder="¿En qué podemos ayudarle?"
                value={formData.subject}
                onChange={e => setFormData({...formData, subject: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Mensaje</label>
              <textarea
                required
                rows={6}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none transition-all"
                placeholder="Escriba su mensaje aquí..."
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full !py-5 flex items-center justify-center gap-2"
            >
              <Send className="h-5 w-5" /> Enviar Mensaje
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
