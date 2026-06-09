import type { LucideIcon } from 'lucide-react';
import { BedDouble, Sparkles, Phone, CalendarCheck, UtensilsCrossed, MapPin } from 'lucide-react';

export interface ReceptionistQuickAction {
  id: string;
  label: string;
  message: string;
  icon: LucideIcon;
}

export const RECEPTIONIST_QUICK_ACTIONS: ReceptionistQuickAction[] = [
  {
    id: 'rooms',
    label: 'Habitaciones',
    message: '¿Qué habitaciones tienen disponibles para mañana?',
    icon: BedDouble,
  },
  {
    id: 'prices',
    label: 'Precios',
    message: '¿Cuáles son los precios por tipo de habitación?',
    icon: BedDouble,
  },
  {
    id: 'spa',
    label: 'Spa',
    message: 'Cuénteme sobre el spa y sus tratamientos',
    icon: Sparkles,
  },
  {
    id: 'restaurant',
    label: 'Restaurante',
    message: '¿A qué hora es el desayuno y qué ofrece el restaurante?',
    icon: UtensilsCrossed,
  },
  {
    id: 'location',
    label: 'Ubicación',
    message: '¿Dónde están ubicados y cómo llego?',
    icon: MapPin,
  },
  {
    id: 'book',
    label: 'Reservar',
    message: 'Me gustaría hacer una reserva',
    icon: CalendarCheck,
  },
  {
    id: 'contact',
    label: 'Contacto',
    message: 'Necesito el teléfono y WhatsApp de recepción',
    icon: Phone,
  },
];

export const RECEPTIONIST_WELCOME =
  'Buenas tardes, le saluda **Valentina** de recepción. ¿En qué puedo ayudarle hoy?';

export const RECEPTIONIST_NAME = 'Valentina';
export const RECEPTIONIST_TITLE = 'Recepción · Lumina Hotel & Spa';
