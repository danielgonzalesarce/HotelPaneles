import type { ChatMessage, HotelSnapshot, KnowledgeEntry } from "./receptionist-types.js";
import { generateFallbackReply } from "./receptionist-fallback.js";
import { tryFallbackBookingReply } from "./receptionist-booking-parse.js";
import {
  answerDateAvailabilityQuery,
  answerRoomQuery,
  isInventoryListRequest,
  isRoomInventoryQuery,
} from "./receptionist-rooms.js";

/** Réplica del enrutamiento local de POST /api/receptionist/chat (sin Gemini). */
export function simulateReceptionistReply(
  message: string,
  snapshot: HotelSnapshot,
  history: ChatMessage[] = [],
  knowledge: KnowledgeEntry[] = []
): string {
  if (isRoomInventoryQuery(message) && isInventoryListRequest(message)) {
    const listed = answerRoomQuery(message, snapshot, history);
    if (listed) return listed;
  }

  const structuredBooking = tryFallbackBookingReply(message, snapshot, history);
  if (structuredBooking) return structuredBooking;

  const dateAvailability = answerDateAvailabilityQuery(message, snapshot, history);
  if (dateAvailability) return dateAvailability;

  return generateFallbackReply(message, snapshot, knowledge, history);
}

export function runConversation(
  turns: string[],
  snapshot: HotelSnapshot,
  onTurn?: (user: string, reply: string, index: number) => void
): ChatMessage[] {
  const history: ChatMessage[] = [];
  turns.forEach((userMsg, index) => {
    const reply = simulateReceptionistReply(userMsg, snapshot, history);
    onTurn?.(userMsg, reply, index);
    history.push({ role: "user", content: userMsg });
    history.push({ role: "assistant", content: reply });
  });
  return history;
}

export function assertNoGenericFallback(reply: string): void {
  if (/Gracias por escribirme\. Puedo ayudarle con:/i.test(reply)) {
    throw new Error(`Respuesta genérica no esperada: ${reply.slice(0, 120)}…`);
  }
}
