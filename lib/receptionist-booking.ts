import type { BookingIntent, HotelSnapshot } from "./receptionist-types.js";
import {
  isRoomAvailable,
  computeStayNights,
} from "./receptionist-context.js";
import { findAvailableRoom } from "./receptionist-rooms.js";
import { findRoomByNumber } from "./receptionist-room-detail.js";

const BOOKING_BLOCK =
  /\[RESERVA_LISTA\]\s*(\{[\s\S]*?\})\s*\[\/RESERVA_LISTA\]/i;

export function stripBookingBlock(text: string): {
  cleanText: string;
  intent?: BookingIntent;
} {
  const match = text.match(BOOKING_BLOCK);
  if (!match) return { cleanText: text.trim() };

  try {
    const intent = JSON.parse(match[1]) as BookingIntent;
    const cleanText = text.replace(BOOKING_BLOCK, "").trim();
    return { cleanText, intent };
  } catch {
    return { cleanText: text.replace(BOOKING_BLOCK, "").trim() };
  }
}

export function buildBookingFromIntent(
  intent: BookingIntent,
  snapshot: HotelSnapshot,
  origin: string
): {
  reservation: Record<string, unknown>;
  checkoutParams: Record<string, string | number>;
  error?: string;
} | null {
  let room = null as ReturnType<typeof findAvailableRoom>;

  if (intent.roomNumber) {
    const specific = findRoomByNumber(snapshot, intent.roomNumber);
    if (!specific) {
      return {
        reservation: {},
        checkoutParams: {},
        error: `No encontré la habitación **${intent.roomNumber}** en el sistema.`,
      };
    }
    room = specific;
  } else {
    room = findAvailableRoom(
      snapshot,
      intent.checkIn,
      intent.checkOut,
      intent.guests,
      intent.roomType
    );
  }

  if (!room) {
    return {
      reservation: {},
      checkoutParams: {},
      error: `No hay habitación "${intent.roomType}" disponible del ${intent.checkIn} al ${intent.checkOut}.`,
    };
  }

  const nights = computeStayNights(intent.checkIn, intent.checkOut);
  if (nights <= 0) {
    return {
      reservation: {},
      checkoutParams: {},
      error: "Las fechas no son válidas (check-out debe ser después del check-in).",
    };
  }

  if (intent.guests > room.capacity) {
    return {
      reservation: {},
      checkoutParams: {},
      error: `${room.name} admite máximo ${room.capacity} huéspedes.`,
    };
  }

  if (!isRoomAvailable(snapshot, room.id, intent.checkIn, intent.checkOut)) {
    return {
      reservation: {},
      checkoutParams: {},
      error: `${room.name} no está disponible del ${intent.checkIn} al ${intent.checkOut}.`,
    };
  }

  const reservationId = Math.random().toString(36).substring(2, 11);
  const totalPrice = room.price * nights;
  const deposit = Math.round(totalPrice * 0.1 * 100) / 100;

  const reservation = {
    id: reservationId,
    roomId: room.id,
    roomName: `Hab. ${room.number} - ${room.name}`,
    userId: "guest-chat",
    userName: intent.guestName,
    userEmail: intent.guestEmail || "huesped@chat.lumina",
    userPhone: intent.guestPhone || "+51 000 000 000",
    checkIn: intent.checkIn,
    checkOut: intent.checkOut,
    guests: intent.guests,
    totalPrice,
    depositPaid: deposit,
    remainingBalance: totalPrice - deposit,
    status: "pending_payment",
    extras: { breakfast: false, shuttle: false, extraBed: false },
    createdAt: new Date().toISOString(),
  };

  return {
    reservation,
    checkoutParams: {
      roomName: room.name,
      roomId: room.id,
      price: deposit,
      totalPrice,
      reservationId,
      source: "chat",
      guestName: intent.guestName,
      checkIn: intent.checkIn,
      checkOut: intent.checkOut,
      origin,
    },
  };
}
