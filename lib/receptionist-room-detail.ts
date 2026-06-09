import type { ChatMessage, HotelSnapshot } from "./receptionist-types.js";
import type { RoomRow } from "./receptionist-rooms.js";

/** Igual que la ficha web en RoomDetail.tsx — no inventar más allá de esto. */
export const WEB_GLOBAL_AMENITIES = ["Servicio al cuarto 24/7", "Limpieza diaria"] as const;

export function getRoomDisplayAmenities(room: RoomRow): string[] {
  const fromDb = room.amenities?.length ? [...room.amenities] : [];
  const extras = WEB_GLOBAL_AMENITIES.filter((a) => !fromDb.includes(a));
  return [...fromDb, ...extras];
}

export function findRoomByNumber(
  snapshot: HotelSnapshot,
  number: string
): RoomRow | undefined {
  return snapshot.rooms.find((r) => r.number === number);
}

export function parseRoomNumber(text: string): string | null {
  const explicit = [
    /hab(?:itaci[oó]n)?\.?\s*(\d{2,4})/i,
    /(?:n[uú]mero|num\.?|#)\s*(\d{2,4})/i,
    /\bla\s+(\d{2,4})\b/i,
    /des(?:eo|ea)\s+(?:la\s+)?hab(?:itaci[oó]n)?\.?\s*(\d{2,4})/i,
  ];
  for (const re of explicit) {
    const m = text.match(re);
    if (m) return m[1];
  }
  if (/habitaci|hab\.|n[uú]mero de habit/i.test(text)) {
    const m = text.match(/\b(\d{3,4})\b/);
    if (m) return m[1];
  }
  return null;
}

/** Número de habitación suelto (ej. "117") en flujo de reserva — no confundir con huéspedes ("2"). */
export function parseBareRoomNumber(text: string): string | null {
  const t = text.trim();
  if (!/^\d{3,4}$/.test(t)) return null;
  const n = parseInt(t, 10);
  if (n < 100 || n > 9999) return null;
  return t;
}

export function resolveRoomFromContext(
  message: string,
  history: ChatMessage[],
  snapshot: HotelSnapshot
): RoomRow | null {
  const fromMessage = parseRoomNumber(message);
  if (fromMessage) {
    return findRoomByNumber(snapshot, fromMessage) ?? null;
  }

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;
    const num = parseRoomNumber(history[i].content);
    if (num) {
      const room = findRoomByNumber(snapshot, num);
      if (room) return room;
    }
  }

  return null;
}

export function isRoomDetailQuery(message: string): boolean {
  const lower = message.toLowerCase();
  if (isRoomInventoryQueryLike(lower) && !/incluye|incluy|amenidades|comodidades|tiene la|detalle de/i.test(lower)) {
    return false;
  }
  return (
    /qu[eé]\s*(incluye|tiene|trae)|incluye\s*(mi|la|esta)|amenidades|comodidades|mi\s+habitaci[oó]n|detalle\s+de\s+(?:la\s+)?hab|informaci[oó]n\s+de\s+(?:la\s+)?hab|caracter[ií]sticas\s+de/i.test(
      lower
    ) || /hab(?:itaci[oó]n)?\.?\s*\d{2,4}/i.test(message)
  );
}

function isRoomInventoryQueryLike(lower: string): boolean {
  return /disponib|listar|lista|dime las|cu[aá]les habitaci|habitaciones (?:disponib|libres|del|para)/i.test(
    lower
  );
}

export function formatRoomDetailAnswer(room: RoomRow): string {
  const amenities = getRoomDisplayAmenities(room);
  const amenityLines = amenities.map((a) => `* ${a}`).join("\n");
  const desc = room.description?.trim();

  return `Según nuestra **ficha oficial** de la web, esto es lo registrado para **Hab. ${room.number}**:

**${room.name}** · **${room.type}** · Piso **${room.floor}** · **S/ ${room.price}**/noche · **${room.capacity}** pers.

${desc ? `*Descripción:* ${desc}\n\n` : ""}**¿Qué incluye esta habitación?**
${amenityLines}

_Solo lo anterior figura en el sistema. Si necesita otro servicio, consúltenos en recepción._`;
}

export function answerRoomDetailQuery(
  message: string,
  snapshot: HotelSnapshot,
  history: ChatMessage[] = []
): string | null {
  if (!isRoomDetailQuery(message)) return null;

  const room = resolveRoomFromContext(message, history, snapshot);
  if (!room) {
    return `¿De qué **número de habitación** desea ver la ficha? Por ejemplo: *"¿qué incluye la habitación 117?"*

Le mostraré **exactamente** lo que aparece en nuestra web, sin añadir servicios que no estén registrados.`;
  }

  return formatRoomDetailAnswer(room);
}

export function buildRoomAmenitiesCatalog(snapshot: HotelSnapshot): string {
  const lines = snapshot.rooms
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
    .map((r) => {
      const amenities = getRoomDisplayAmenities(r).join(", ");
      return `- Hab.${r.number} (${r.type}, Piso ${r.floor}, S/${r.price}): ${amenities}`;
    });
  return lines.join("\n");
}

export function answerHotelServicesQuery(message: string, snapshot: HotelSnapshot): string | null {
  const lower = message.toLowerCase();

  if (/wifi|wi-fi|internet/i.test(lower) && !/habitaci|\d{3}/i.test(lower)) {
    return `Sí, contamos con **WiFi de alta velocidad** en **todas las habitaciones** y áreas comunes (lobby, restaurante, spa), **sin costo adicional**.

Si desea confirmar la señal en una habitación concreta, indíqueme el **número** y le detallo la ficha. ¿Desea **reservar**? 📞 ${snapshot.config.phone}`;
  }

  if (/estacionamiento|parking|parqueo/i.test(lower) && !/habitaci|\d{3}/i.test(lower)) {
    return `Sí, contamos con **estacionamiento** para huéspedes (sujeto a disponibilidad al llegar). Recepción **24 h** en planta baja.

¿Desea **reservar** habitación? 📞 ${snapshot.config.phone}`;
  }

  const wantsServices =
    /check-in|check-out|checkin|checkout|late|spa|restaurante|desayuno|piscina|estacionamiento|gimnasio|servicios|pol[ií]tica/i.test(
      lower
    );
  const wantsAll = /todo eso|todo lo|toda la info|informaci[oó]n completa/i.test(lower);

  if (!wantsServices && !wantsAll) return null;
  if (/habitaci|incluye|amenidades|\d{3}/i.test(lower) && !wantsAll) return null;

  const signOff = `¿Desea **reservar** o consultar una habitación en concreto? ${snapshot.config.phone}`;

  return `Le resumo lo que tenemos **confirmado** en el hotel:

**Check-in / Check-out**
* Entrada: **15:00** · Salida: **12:00**
* Recepción **24 h**
* Late check-out: sujeto a disponibilidad (consúltelo al reservar)

**Spa & Wellness** (8:00 – 21:00)
* Masaje relajante (60 min): desde **S/ 120**
* Facial premium: **S/ 95**
* Hidroterapia: **S/ 80**

**Restaurante**
* Desayuno buffet: **7:00 – 10:30** (consulte si está incluido en su tarifa)
* Almuerzo y cena: carta

**Instalaciones generales**
* WiFi · Piscina climatizada · Estacionamiento · Gimnasio

**Reservas:** adelanto **10%** (Stripe), saldo en el hotel. Cancelación con **48 h** de anticipación.

Para **amenidades de una habitación específica**, indíqueme el número (ej. *"¿qué incluye la 117?"*) y le respondo con la ficha exacta de la web.

${signOff}`;
}
