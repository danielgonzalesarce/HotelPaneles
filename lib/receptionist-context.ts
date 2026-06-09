import { addDays, format, parseISO, differenceInDays } from "date-fns";
import type { HotelSnapshot } from "./receptionist-types.js";

function datesOverlap(aIn: string, aOut: string, bIn: string, bOut: string): boolean {
  return parseISO(aIn) < parseISO(bOut) && parseISO(bIn) < parseISO(aOut);
}

function countAvailable(snapshot: HotelSnapshot, checkIn: string, checkOut: string) {
  const blocking = snapshot.reservations.filter(
    (r) => r.status === "confirmed" || r.status === "pending_payment"
  );
  const unavailable = new Set<string>();
  blocking.forEach((r) => {
    if (datesOverlap(checkIn, checkOut, r.checkIn, r.checkOut)) {
      unavailable.add(r.roomId);
    }
  });
  const available = snapshot.rooms.filter(
    (r) => !unavailable.has(r.id) && r.status !== "Mantenimiento" && r.status !== "En limpieza"
  );
  return { available, unavailable: unavailable.size, total: snapshot.rooms.length };
}

export function buildHotelContextBlock(snapshot: HotelSnapshot): string {
  const { config, rooms, reviews } = snapshot;
  const floors = [...new Set(rooms.map((r) => r.floor))].sort(
    (a, b) => Number(a) - Number(b)
  );

  const types = [...new Set(rooms.map((r) => r.type))];
  const priceByType = types.map((type) => {
    const ofType = rooms.filter((r) => r.type === type);
    const prices = ofType.map((r) => r.price);
    return `- ${type}: ${ofType.length} hab. · S/${Math.min(...prices)}${Math.min(...prices) !== Math.max(...prices) ? `–S/${Math.max(...prices)}` : ""}/noche`;
  });

  const tomorrowIn = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const tomorrowOut = format(addDays(new Date(), 2), "yyyy-MM-dd");
  const availTomorrow = countAvailable(snapshot, tomorrowIn, tomorrowOut);

  const featured = rooms
    .filter((r) => r.price <= 450)
    .slice(0, 8)
    .map(
      (r) =>
        `  Hab.${r.number} · ${r.name} · Piso ${r.floor} · S/${r.price} · ${r.capacity}p · ${r.status}`
    );

  const reviewSample = reviews
    .slice(0, 4)
    .map((r) => `  ${r.userName} (${r.rating}/5): "${r.comment.slice(0, 100)}"`)
    .join("\n");

  return `
## Hotel en vivo (datos actuales del sistema)
Nombre: ${config.name}
Dirección: ${config.address}
Teléfono: ${config.phone} | WhatsApp: +${config.whatsapp} | Email: ${config.email}
Descripción: ${config.description ?? "Hotel boutique de lujo en San Isidro, Lima."}

Estructura: ${floors.length} pisos (plantas ${floors.join(", ")}) · ${rooms.length} habitaciones totales
Tarifas por categoría:
${priceByType.join("\n")}

Disponibilidad MAÑANA (${tomorrowIn} → ${tomorrowOut}, 1 noche):
${availTomorrow.available.length} libres de ${availTomorrow.total} (${availTomorrow.unavailable} reservadas/ocupadas)

Muestra de habitaciones:
${featured.join("\n")}

Reseñas recientes:
${reviewSample || "  Huéspedes destacan spa, atención y suites."}

Políticas:
- Check-in 15:00 · Check-out 12:00
- Cancelación con 48h de anticipación
- Reserva: adelanto 10% vía Stripe, saldo en hotel
`.trim();
}

export function findRoomByType(snapshot: HotelSnapshot, roomType: string) {
  const lower = roomType.toLowerCase();
  return (
    snapshot.rooms.find((r) => r.name.toLowerCase().includes(lower)) ||
    snapshot.rooms.find((r) => r.type.toLowerCase().includes(lower)) ||
    snapshot.rooms.find((r) => lower.includes("premium") && r.type.includes("Premium")) ||
    snapshot.rooms.find((r) => lower.includes("ejecutiva") && r.type === "Suite") ||
    snapshot.rooms.find((r) => lower.includes("doble") && r.type === "Doble") ||
    snapshot.rooms.find((r) => (lower.includes("estandar") || lower.includes("estándar")) && r.type === "Estándar")
  );
}

export function isRoomAvailable(
  snapshot: HotelSnapshot,
  roomId: string,
  checkIn: string,
  checkOut: string
): boolean {
  const blocking = snapshot.reservations.filter(
    (r) => r.status === "confirmed" || r.status === "pending_payment"
  );
  return !blocking.some(
    (r) =>
      r.roomId === roomId && datesOverlap(checkIn, checkOut, r.checkIn, r.checkOut)
  );
}

export function computeStayNights(checkIn: string, checkOut: string): number {
  return differenceInDays(parseISO(checkOut), parseISO(checkIn));
}
