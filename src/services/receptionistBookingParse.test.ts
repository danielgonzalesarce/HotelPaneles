import { describe, it, expect } from "vitest";
import {
  isBookingMessage,
  parseBookingFromMessage,
  tryFallbackBookingReply,
  renderAvailableRoomNumbersForType,
  renderBookingRoomOptions,
} from "../../lib/receptionist-booking-parse.js";
import { buildBookingContext } from "../../lib/receptionist-conversation.js";
import { stripBookingBlock } from "../../lib/receptionist-booking.js";

const snapshot = {
  config: {
    name: "Lumina Hotel & Spa",
    address: "Av. Lujo 123",
    phone: "+51 1 234 5678",
    email: "a@b.com",
    whatsapp: "51999999999",
  },
  rooms: [
    { id: "1", number: "101", floor: "1", name: "Estándar", type: "Estándar", description: "", price: 80, capacity: 2, status: "Reservada", amenities: [] },
    { id: "2", number: "103", floor: "1", name: "Estándar 103", type: "Estándar", description: "", price: 80, capacity: 2, status: "Disponible", amenities: [] },
    { id: "3", number: "102", floor: "1", name: "Doble", type: "Doble", description: "", price: 120, capacity: 4, status: "Disponible", amenities: [] },
  ],
  reservations: [],
  reviews: [],
  gallery: [],
};

describe("receptionist-booking-parse", () => {
  it("detecta mensaje de reserva con nombre, fechas y huéspedes", () => {
    const msg = "Daniel Alexander, 11/06/2026 al 12/06/2026 y sosmos 2 personas";
    expect(isBookingMessage(msg)).toBe(true);
    expect(isRoomInventoryQuery(msg)).toBe(false);
  });

  it("parsea datos de reserva", () => {
    const parsed = parseBookingFromMessage(
      "Daniel Alexander, 11/06/2026 al 12/06/2026 y sosmos 2 personas"
    );
    expect(parsed?.guestName).toBe("Daniel Alexander");
    expect(parsed?.checkIn).toBe("2026-06-11");
    expect(parsed?.checkOut).toBe("2026-06-12");
    expect(parsed?.guests).toBe(2);
  });

  it("parsea nombre con coma antes de reserva", () => {
    const parsed = parseBookingFromMessage(
      "Daniel Alexander, reserva para el jueves al viernes, somos 2"
    );
    expect(parsed?.guestName).toBe("Daniel Alexander");
    expect(parsed?.guests).toBe(2);
  });

  it("no pide número de habitación antes de listar los disponibles", () => {
    const ctx = buildBookingContext("2 personas", [
      { role: "user", content: "Me gustaría hacer una reserva" },
      { role: "assistant", content: "¿Para qué fecha?" },
      { role: "user", content: "10/06 al 15/06" },
      { role: "assistant", content: "¿Nombre?" },
      { role: "user", content: "Daniel Alexander Arce" },
    ]);
    ctx.guestName = "Daniel Alexander Arce";
    ctx.guests = 2;
    ctx.checkIn = "2026-06-10";
    ctx.checkOut = "2026-06-15";

    const options = renderBookingRoomOptions(snapshot, ctx);
    expect(options).toMatch(/Primero elija el \*\*tipo\*\*/i);
    expect(options).toMatch(/todos los n[uú]meros libres/i);
    expect(options).not.toMatch(/habitaci[oó]n 117/i);
    expect(options).not.toMatch(/Puede decirme:/i);
  });

  it("muestra opciones antes del pago y confirma tras sí, confirmo", () => {
    const history = [
      {
        role: "user" as const,
        content: "Daniel Alexander, 11/06/2026 al 12/06/2026 y somos 2 personas",
      },
      {
        role: "assistant" as const,
        content: "opciones disponibles…",
      },
      { role: "user" as const, content: "Estándar" },
      {
        role: "assistant" as const,
        content: "¿Qué número de habitación desea reservar?",
      },
      { role: "user" as const, content: "103" },
      {
        role: "assistant" as const,
        content: 'Responda "sí, confirmo" y le envío el enlace del adelanto.',
      },
    ];
    const options = tryFallbackBookingReply(
      "Daniel Alexander, 11/06/2026 al 12/06/2026 y somos 2 personas",
      snapshot
    );
    expect(options).toMatch(/opciones|Estándar/i);
    expect(options).not.toMatch(/RESERVA_LISTA/);

    const afterType = tryFallbackBookingReply("Estándar", snapshot, history.slice(0, 3));
    expect(afterType).toMatch(/n[uú]mero de habitaci/i);
    expect(afterType).toMatch(/103/);
    expect(afterType).not.toMatch(/101/);

    const reply = tryFallbackBookingReply("sí, confirmo", snapshot, history);
    expect(reply).toMatch(/RESERVA_LISTA/);
    const { intent } = stripBookingBlock(reply!);
    expect(intent?.guestName).toBe("Daniel Alexander");
    expect(intent?.roomNumber).toBe("103");
  });

  it("no ofrece habitación reservada y lista solo libres", () => {
    const ctx = buildBookingContext("101", [
      { role: "user", content: "Daniel Alexander, 11/06/2026 al 12/06/2026 y somos 2" },
      { role: "assistant", content: "opciones" },
      { role: "user", content: "Estándar" },
    ]);
    ctx.guestName = "Daniel Alexander";
    ctx.guests = 2;
    ctx.checkIn = "2026-06-11";
    ctx.checkOut = "2026-06-12";

    const list = renderAvailableRoomNumbersForType(snapshot, ctx, "Estándar");
    expect(list).toMatch(/103/);
    expect(list).not.toMatch(/Hab\. 101/);

    const unavailable = tryFallbackBookingReply("101", snapshot, [
      { role: "user", content: "Daniel Alexander, 11/06/2026 al 12/06/2026 y somos 2" },
      { role: "assistant", content: "opciones" },
      { role: "user", content: "Estándar" },
      { role: "assistant", content: "¿Qué número de habitación desea?" },
    ]);
    expect(unavailable).toMatch(/no est[aá] disponible/i);
    expect(unavailable).toMatch(/103/);
    expect(unavailable).not.toMatch(/101.*libre/i);
  });
});

function isRoomInventoryQuery(message: string): boolean {
  const lower = message.toLowerCase();
  const trimmed = message.trim();
  if (
    /^[A-Za-zÀ-ú][\w\s.'-]{2,50},\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(trimmed) ||
    (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\s+al\s+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/i.test(message) &&
      /(?:somos|seremos|sosmos|me llamo|nombre)/i.test(lower))
  ) {
    return false;
  }
  return /personas|habitaci|disponib/i.test(lower);
}
