import React from 'react';
import { Shield, FileText, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Legal() {
  return (
    <div className="w-full">
      <div className="relative w-full h-[300px] mb-12 shadow-2xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=2000&q=80"
          alt="Arquitectura profesional"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"></div>
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center space-y-3 px-4 drop-shadow-lg pt-20">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter">Información Legal</h1>
          <p className="text-slate-100 font-light text-lg md:text-xl max-w-2xl mx-auto">
            Políticas de seguridad y condiciones de servicio.
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-16">


      {/* Políticas de Seguridad */}
      <section id="seguridad" className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900">Políticas de Seguridad</h2>
        </div>
        <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-sm space-y-6 text-gray-700 leading-relaxed">
          <p>En Lumina Hotel & Spa, la seguridad de nuestros huéspedes y colaboradores es nuestra máxima prioridad. Hemos implementado protocolos rigurosos para garantizar un entorno seguro y tranquilo.</p>
          
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-indigo-600" /> Vigilancia 24/7
            </h3>
            <p>Contamos con personal de seguridad profesional y sistemas de videovigilancia en todas las áreas comunes las 24 horas del día.</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-indigo-600" /> Control de Acceso
            </h3>
            <p>El acceso a las habitaciones está restringido únicamente a los huéspedes registrados mediante sistemas de llaves electrónicas codificadas.</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-indigo-600" /> Protección de Datos
            </h3>
            <p>Su información personal y financiera está protegida bajo los más altos estándares de cifrado y cumplimiento de las leyes de protección de datos personales.</p>
          </div>
        </div>
      </section>

      {/* Términos y Condiciones */}
      <section id="terminos" className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
            <FileText className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Términos y Condiciones</h1>
        </div>
        <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-sm space-y-6 text-gray-700 leading-relaxed">
          <p>Al realizar una reserva o utilizar nuestros servicios, usted acepta los siguientes términos y condiciones establecidos por Lumina Hotel & Spa.</p>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-indigo-600" /> Reservas y Pagos
            </h3>
            <p>Todas las reservas deben ser garantizadas con una tarjeta de crédito válida o mediante el pago anticipado según las políticas de la tarifa seleccionada.</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-indigo-600" /> Política de Cancelación
            </h3>
            <p>Las cancelaciones deben realizarse con al menos 48 horas de anticipación para evitar cargos, a menos que la tarifa especifique lo contrario (tarifas no reembolsables).</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-indigo-600" /> Check-in y Check-out
            </h3>
            <p>El horario de ingreso (check-in) es a partir de las 15:00 horas y el de salida (check-out) es hasta las 12:00 horas.</p>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
