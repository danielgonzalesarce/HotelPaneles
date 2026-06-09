import React from 'react';
import { MessageCircle } from 'lucide-react';
import { storage } from '../services/storage';

export default function WhatsAppButton() {
  const config = storage.getConfig();
  const phoneNumber = config.whatsapp;
  const message = encodeURIComponent('Hola, quiero información sobre las habitaciones del hotel.');
  const url = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:bg-green-600 transition-all hover:scale-110 active:scale-95 group"
    >
      <div
        className="absolute inset-0 rounded-full bg-green-500 -z-10 animate-ping opacity-20"
      />
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
