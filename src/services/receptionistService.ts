import { storage } from './storage';
import { markRoomAsReserved } from './roomAvailability';
import type { Reservation } from '../types';

const SESSION_KEY = 'lumina_receptionist_session';
const KNOWLEDGE_KEY = 'lumina_receptionist_knowledge';

export interface ReceptionistMessage {
  role: 'user' | 'assistant';
  content: string;
}

function loadSessionId(): string | undefined {
  return sessionStorage.getItem(SESSION_KEY) ?? undefined;
}

function saveSessionId(id: string) {
  sessionStorage.setItem(SESSION_KEY, id);
}

export function resetReceptionistSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function buildHotelSnapshot() {
  const config = storage.getConfig();
  return {
    config: {
      name: config.name,
      address: config.address,
      phone: config.phone,
      email: config.email,
      whatsapp: config.whatsapp,
      description: config.description,
    },
    rooms: storage.getRooms().map((r) => ({
      id: r.id,
      number: r.number,
      floor: r.floor,
      name: r.name,
      type: r.type,
      description: r.description,
      price: r.price,
      capacity: r.capacity,
      status: r.status,
      amenities: r.amenities,
    })),
    reservations: storage.getReservations().map((r) => ({
      id: r.id,
      roomId: r.roomId,
      roomName: r.roomName,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      status: r.status,
      guests: r.guests,
    })),
    reviews: storage.getReviews().filter((r) => r.approved).slice(0, 12).map((r) => ({
      userName: r.userName,
      rating: r.rating,
      comment: r.comment,
    })),
    gallery: storage.getGallery().map((g) => ({ title: g.title })),
  };
}

function mergeLocalKnowledge(entries?: Array<{ topic: string; content: string }>) {
  if (!entries?.length) return;
  try {
    const existing = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]') as Array<{
      topic: string;
      content: string;
    }>;
    const merged = [...entries, ...existing].slice(0, 50);
    localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(merged));
  } catch {
    localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(entries));
  }
}

export const receptionistService = {
  async sendMessage(
    message: string,
    history: ReceptionistMessage[] = []
  ): Promise<{ text: string }> {
    const response = await fetch('/api/receptionist/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        sessionId: loadSessionId(),
        hotelSnapshot: buildHotelSnapshot(),
        clientHistory: history.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 404) {
      throw new Error(
        'Servidor desactualizado: reinicie con "node node_modules/tsx/dist/cli.mjs server.ts" (no use vite solo).'
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message || data.error || 'Recepción no disponible en este momento. Intente de nuevo.'
      );
    }

    if (data.sessionId) saveSessionId(data.sessionId);

    if (data.booking?.reservation) {
      storage.saveReservation(data.booking.reservation as Reservation);
      markRoomAsReserved(String(data.booking.reservation.roomId));
    }

    if (data.newKnowledge) mergeLocalKnowledge(data.newKnowledge);

    return { text: data.text || 'Un momento, por favor…' };
  },
};
