import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Send, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { storage } from '../services/storage';
import { Complaint } from '../types';

export default function Complaints() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Partial<Complaint>>({
    documentType: 'DNI',
    type: 'Reclamo',
    status: 'Pendiente'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const complaint: Complaint = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      fullName: formData.fullName || '',
      documentType: formData.documentType as any,
      documentNumber: formData.documentNumber || '',
      email: formData.email || '',
      phone: formData.phone || '',
      address: formData.address || '',
      type: formData.type as any,
      description: formData.description || '',
      status: 'Pendiente'
    };

    storage.saveComplaint(complaint);
    setSubmitted(true);
    window.scrollTo(0, 0);
  };

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center justify-center w-24 h-24 bg-green-100 text-green-600 rounded-full"
        >
          <CheckCircle className="h-12 w-12" />
        </motion.div>
        <h1 className="text-4xl font-bold text-gray-900">¡Reclamación Enviada!</h1>
        <p className="text-xl text-gray-600">
          Hemos recibido su mensaje. Nos pondremos en contacto con usted a la brevedad posible a través del correo electrónico proporcionado.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-block bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative w-full h-[300px] mb-12 shadow-2xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2000&q=80"
          alt="Espacio de trabajo profesional"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center space-y-3 px-4 drop-shadow-lg pt-20">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter">Libro de Reclamaciones</h1>
          <p className="text-slate-100 font-light text-lg md:text-xl max-w-2xl mx-auto">
            Su opinión nos ayuda a mejorar. Estamos comprometidos con su satisfacción.
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">


      <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Nombre Completo</label>
            <input
              required
              type="text"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.fullName || ''}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Tipo Doc.</label>
              <select
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.documentType}
                onChange={e => setFormData({ ...formData, documentType: e.target.value as any })}
              >
                <option value="DNI">DNI</option>
                <option value="CE">CE</option>
                <option value="Pasaporte">Pasaporte</option>
              </select>
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-bold text-gray-700">Nro. Documento</label>
              <input
                required
                type="text"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.documentNumber || ''}
                onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Correo Electrónico</label>
            <input
              required
              type="email"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.email || ''}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Teléfono / Celular</label>
            <input
              required
              type="tel"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.phone || ''}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-gray-700">Dirección</label>
            <input
              required
              type="text"
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.address || ''}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4 border-t border-gray-100 pt-8">
          <div className="flex gap-8">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                className="w-4 h-4 text-indigo-600"
                checked={formData.type === 'Reclamo'}
                onChange={() => setFormData({ ...formData, type: 'Reclamo' })}
              />
              <span className="font-bold text-gray-700">Reclamo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                className="w-4 h-4 text-indigo-600"
                checked={formData.type === 'Queja'}
                onChange={() => setFormData({ ...formData, type: 'Queja' })}
              />
              <span className="font-bold text-gray-700">Queja</span>
            </label>
          </div>
          <p className="text-xs text-gray-500">
            * Reclamo: Disconformidad relacionada a los productos o servicios. <br />
            * Queja: Disconformidad no relacionada a los productos o servicios; o malestar o descontento respecto a la atención al público.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Descripción del Reclamo o Queja</label>
            <textarea
              required
              rows={6}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Detalle lo sucedido..."
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
        >
          <Send className="h-5 w-5" /> Enviar Reclamación
        </button>
      </form>
      </div>
    </div>
  );
}
