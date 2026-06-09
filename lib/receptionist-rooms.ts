import { addDays, format } from "date-fns";
import type { ChatMessage, HotelSnapshot } from "./receptionist-types.js";
import {
  parseStayDates,
  parseStayDatesFromUserHistory,
  formatWeekdayLabel,
  parseStayDurationNights,
} from "./receptionist-dates.js";

export type RoomRow = HotelSnapshot["rooms"][number];

export interface RoomQuery {
  availableOnly: boolean;
  checkIn: string;
  checkOut: string;
  floor?: string;
  roomType?: string;
  price?: number;
  priceMin?: number;
  priceMax?: number;
  minCapacity?: number;
  exactCapacity?: number;
  listMode: boolean;
}

function detectRoomType(text: string): string | null {
  const lower = text.toLowerCase();
  if (/premium|lumina/.test(lower)) return "Suite Premium";
  if (/ejecutiva/.test(lower)) return "Suite";
  if (/\bsuite\b/.test(lower) && !/premium/.test(lower)) return "Suite";
  if (/doble/.test(lower)) return "Doble";
  if (/est[aá]ndar|standard/.test(lower)) return "Estándar";
  return null;
}

export function detectRoomTypeLabel(text: string): string | null {
  return detectRoomType(text);
}

export function getAvailableRooms(
  snapshot: HotelSnapshot,
  checkIn: string,
  checkOut: string
): RoomRow[] {
  const blocking = snapshot.reservations.filter(
    (r) => r.status === "confirmed" || r.status === "pending_payment"
  );
  const unavailable = new Set<string>();
  blocking.forEach((r) => {
    if (checkIn < r.checkOut && r.checkIn < checkOut) unavailable.add(r.roomId);
  });
  return snapshot.rooms.filter(
    (r) =>
      !unavailable.has(r.id) &&
      r.status !== "Mantenimiento" &&
      r.status !== "En limpieza" &&
      !/reservad|ocupad/i.test(r.status)
  );
}

export function findAvailableRoom(
  snapshot: HotelSnapshot,
  checkIn: string,
  checkOut: string,
  guests: number,
  roomType?: string
): RoomRow | null {
  let pool = getAvailableRooms(snapshot, checkIn, checkOut).filter(
    (r) => r.capacity >= guests
  );

  if (roomType) {
    pool = pool.filter(
      (r) =>
        r.type === roomType ||
        r.name.toLowerCase().includes(roomType.toLowerCase())
    );
  }

  pool.sort((a, b) => a.price - b.price || a.number.localeCompare(b.number, undefined, { numeric: true }));
  return pool[0] ?? null;
}

function detectFloor(text: string): string | null {
  const lower = text.toLowerCase();
  const m = lower.match(/(?:piso|planta|nivel)\s*(\d+)/);
  if (m) return m[1];
  if (/primer\s+piso|planta\s+baja/.test(lower)) return "1";
  if (/segundo\s+piso/.test(lower)) return "2";
  if (/tercer\s+piso/.test(lower)) return "3";
  return null;
}

function detectCapacity(text: string): { min?: number; exact?: number } {
  const lower = text.toLowerCase();
  const exact = lower.match(/(?:para|de|capacidad|caben?)\s*(\d+)\s*(?:personas?|hu[eé]spedes?|pers)/);
  if (exact) return { exact: parseInt(exact[1], 10) };

  const min = lower.match(/(?:m[ií]nimo|al menos|desde)\s*(\d+)\s*(?:personas?|hu[eé]spedes?|pers)/);
  if (min) return { min: parseInt(min[1], 10) };

  const simple = lower.match(/(\d+)\s*(?:personas?|hu[eé]spedes?|pers\.?)/);
  if (simple && /habitaci|capacidad|para|caben|acomod|grupo|familia/.test(lower)) {
    return { min: parseInt(simple[1], 10) };
  }

  return {};
}

function detectPrice(text: string): { exact?: number; min?: number; max?: number } {
  const lower = text.toLowerCase();

  if (/personas?|hu[eé]spedes?|pers\.?/i.test(lower)) {
    return {};
  }

  const range = lower.match(/(?:entre|de)\s*s?\/?\s*(\d+)\s*(?:y|a|-)\s*s?\/?\s*(\d+)/);
  if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };

  const exact =
    lower.match(/(?:precio|tarifa|de)\s*s?\/?\s*(\d+)/) ||
    lower.match(/\bs?\/?\s*(\d+)\s*(?:soles|por noche|\/noche)\b/);
  if (exact) return { exact: parseInt(exact[1], 10) };

  const under = lower.match(/(?:menos de|hasta|m[aá]ximo)\s*s?\/?\s*(\d+)/);
  if (under) return { max: parseInt(under[1], 10) };

  const over = lower.match(/(?:m[aá]s de|desde|superior a)\s*s?\/?\s*(\d+)/);
  if (over) return { min: parseInt(over[1], 10) };

  const bare = lower.match(/\b(?:las de|de)\s*s?\/?\s*(\d{2,3})\b/);
  if (bare) return { exact: parseInt(bare[1], 10) };

  return {};
}

function detectDates(text: string): { checkIn: string; checkOut: string; availableOnly: boolean } {
  const parsed = parseStayDates(text);
  const tomorrowIn = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const tomorrowOut = format(addDays(new Date(), 2), "yyyy-MM-dd");

  if (parsed.checkIn && parsed.checkOut) {
    return {
      checkIn: parsed.checkIn,
      checkOut: parsed.checkOut,
      availableOnly: parsed.availableOnly ?? false,
    };
  }

  return { checkIn: tomorrowIn, checkOut: tomorrowOut, availableOnly: parsed.availableOnly ?? false };
}

export function isTypeComparisonQuery(message: string): boolean {
  return /(?:solo|sol[oó]|unicamente|[uú]nicamente|nada m[aá]s).*?(?:doble|est[aá]ndar|suite)|qu[eé]\s+otras?\s+habitaci|otras?\s+(?:categor[ií]as?|tipos?)|adem[aá]s\s+de|qu[eé]\s+m[aá]s\s+(?:tienes|hay|ofreces)|tienes\s+solo/i.test(
    message.toLowerCase()
  );
}

/** Petición de listado: "dime las Estándar", "lista las Doble"… (no elección en reserva). */
export function isInventoryListRequest(message: string): boolean {
  const trimmed = message.trim();
  const lower = message.toLowerCase();
  return (
    /^(?:dime|lista|listar|mu[eé]str|cu[aá]les|cuales|detalle|y las|solo las|las)\b/i.test(trimmed) ||
    /\b(?:dime|lista|listar|mu[eé]str|cu[aá]les)\s+(?:las?|los?)\b/i.test(lower)
  );
}

export function isBareRoomTypeChoice(message: string): boolean {
  return /^(?:est[aá]ndar|standard|doble|suite(?:\s+premium)?|premium|lumina)$/i.test(
    message.trim()
  );
}

export function isRoomInventoryQuery(message: string): boolean {
  const lower = message.toLowerCase();
  const trimmed = message.trim();

  if (isBareRoomTypeChoice(trimmed)) {
    return false;
  }
  if (/^\d{3,4}$/.test(trimmed)) {
    return false;
  }

  if (
    /^[A-Za-zÀ-ú][\w\s.'-]{2,50},\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(trimmed) ||
    (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\s+al\s+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/i.test(message) &&
      /(?:somos|seremos|sosmos|me llamo|nombre)/i.test(lower))
  ) {
    return false;
  }

  if (
    /habitaci|cuartos|suites|alojamiento|hab\.|listar|lista|mu[eé]str|dime|cu[aá]les|cuales|disponib|libre|piso|planta|capacidad|personas|hu[eé]spedes|precio|tarifa|tipo|est[aá]ndar|doble|premium|\bsuite\b|\blas de\b|\besas\b|\bde s?\/?\s*\d{2,3}\b/i.test(
      lower
    )
  ) {
    if (/ubicaci|contacto|spa|restaurante|pol[ií]tica|cancel/i.test(lower) && !/habitaci|piso|capacidad|precio|tipo|disponib|las de|\bde s?\/?\s*\d/.test(lower)) {
      return false;
    }
    return true;
  }
  return false;
}

export function parseRoomQuery(message: string, history: ChatMessage[] = []): RoomQuery {
  const userHistory = history.filter((h) => h.role === "user").slice(-6);
  const followUp = /^(?:dime|cu[aá]les|cuales|las|esas|lista|listar|mu[eé]str|detalle|y las|solo)/i.test(
    message.trim()
  );

  const fromMsg = parseStayDates(message);
  const fromHist = parseStayDatesFromUserHistory(history, message);

  let checkIn = fromMsg.checkIn ?? fromHist.checkIn;
  let checkOut = fromMsg.checkOut ?? fromHist.checkOut;
  if (checkIn && !checkOut) {
    checkOut = format(addDays(new Date(`${checkIn}T12:00:00`), 1), "yyyy-MM-dd");
  }
  if (!checkIn) {
    checkIn = format(addDays(new Date(), 1), "yyyy-MM-dd");
    checkOut = format(addDays(new Date(), 2), "yyyy-MM-dd");
  }

  const availableOnly =
    (fromMsg.availableOnly ?? false) ||
    (fromHist.availableOnly ?? false) ||
    /disponib|libre|ocupad|hay habitaci|para el (?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)/i.test(
      message
    );

  const combinedFollowUp = followUp
    ? [...userHistory, { role: "user" as const, content: message }].map((h) => h.content).join(" ")
    : message;

  const floor = detectFloor(message) ?? (followUp ? detectFloor(combinedFollowUp) : null);
  const roomType =
    detectRoomType(message) ||
    (followUp && !isTypeComparisonQuery(message) ? detectRoomType(combinedFollowUp) : null);

  const cap = detectCapacity(message);
  const capHistory = followUp ? detectCapacity(combinedFollowUp) : {};
  const price = detectPrice(message);
  const priceHistory = followUp ? detectPrice(combinedFollowUp) : {};

  const wantsDetailedList =
    /listar|lista|mu[eé]str|dime|detalle|n[uú]meros|nombres|las de|esas/i.test(message.toLowerCase()) &&
    !/qu[eé]\s+otras|solo.*doble|qu[eé]\s+m[aá]s/i.test(message.toLowerCase());

  const listMode =
    wantsDetailedList ||
    Boolean(
      followUp &&
        (roomType || floor || cap.min || cap.exact || price.exact || priceHistory.exact)
    );

  return {
    availableOnly,
    checkIn,
    checkOut: checkOut!,
    floor: floor ?? undefined,
    roomType: isTypeComparisonQuery(message) ? undefined : roomType ?? undefined,
    price: price.exact ?? priceHistory.exact,
    priceMin: price.min ?? priceHistory.min,
    priceMax: price.max ?? priceHistory.max,
    minCapacity: cap.min ?? capHistory.min,
    exactCapacity: cap.exact ?? capHistory.exact,
    listMode,
  };
}

export function queryRooms(snapshot: HotelSnapshot, query: RoomQuery): RoomRow[] {
  let pool = query.availableOnly
    ? getAvailableRooms(snapshot, query.checkIn, query.checkOut)
    : [...snapshot.rooms];

  if (query.floor) {
    pool = pool.filter((r) => r.floor === query.floor);
  }

  if (query.roomType) {
    pool = pool.filter(
      (r) =>
        r.type === query.roomType ||
        r.name.toLowerCase().includes(query.roomType!.toLowerCase())
    );
  }

  if (query.price != null) {
    pool = pool.filter((r) => r.price === query.price);
  } else {
    if (query.priceMin != null) pool = pool.filter((r) => r.price >= query.priceMin!);
    if (query.priceMax != null) pool = pool.filter((r) => r.price <= query.priceMax!);
  }

  if (query.exactCapacity != null) {
    pool = pool.filter((r) => r.capacity === query.exactCapacity);
  } else if (query.minCapacity != null) {
    pool = pool.filter((r) => r.capacity >= query.minCapacity!);
  }

  return pool.sort((a, b) => {
    const floorCmp = Number(a.floor) - Number(b.floor);
    if (floorCmp !== 0) return floorCmp;
    return a.number.localeCompare(b.number, undefined, { numeric: true });
  });
}

function buildFilterDescription(query: RoomQuery): string {
  const parts: string[] = [];

  if (query.availableOnly) {
    parts.push(`disponibles del **${query.checkIn}** al **${query.checkOut}**`);
  }
  if (query.roomType) parts.push(`tipo **${query.roomType}**`);
  if (query.floor) parts.push(`**piso ${query.floor}**`);
  if (query.price != null) parts.push(`precio **S/ ${query.price}**/noche`);
  if (query.priceMin != null && query.priceMax != null) {
    parts.push(`precio **S/ ${query.priceMin} – S/ ${query.priceMax}**`);
  } else if (query.priceMax != null) parts.push(`hasta **S/ ${query.priceMax}**`);
  else if (query.priceMin != null) parts.push(`desde **S/ ${query.priceMin}**`);
  if (query.exactCapacity != null) parts.push(`capacidad **${query.exactCapacity} personas**`);
  else if (query.minCapacity != null) parts.push(`mínimo **${query.minCapacity} personas**`);

  return parts.length > 0 ? parts.join(" · ") : "del hotel";
}

export function formatRoomList(rooms: RoomRow[], limit = 15): string {
  if (rooms.length === 0) {
    return "No encontré habitaciones con esos criterios.";
  }

  const lines = rooms.slice(0, limit).map(
    (r) =>
      `* **Hab. ${r.number}** — ${r.name} · **${r.type}** · Piso ${r.floor} · S/ ${r.price}/noche · **${r.capacity} pers.** · ${r.status}`
  );

  if (rooms.length > limit) {
    lines.push(`* … y **${rooms.length - limit}** habitaciones más.`);
  }

  return lines.join("\n");
}

export function formatRoomQuerySummary(rooms: RoomRow[]): string {
  const byType = new Map<string, number>();
  const byFloor = new Map<string, number>();
  rooms.forEach((r) => {
    byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
    byFloor.set(r.floor, (byFloor.get(r.floor) ?? 0) + 1);
  });

  const typeLine = [...byType.entries()].map(([t, n]) => `${t}: ${n}`).join(" · ");
  const floorLine = [...byFloor.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([f, n]) => `Piso ${f}: ${n}`)
    .join(" · ");

  return `**Resumen:** ${rooms.length} habitación(es) — ${typeLine}\n**Por piso:** ${floorLine}`;
}

export function answerDateAvailabilityQuery(
  message: string,
  snapshot: HotelSnapshot,
  history: ChatMessage[] = []
): string | null {
  const stay = parseStayDates(message);
  if (!stay.checkIn || !stay.checkOut) return null;

  const lower = message.toLowerCase();
  const hadAvailabilityChat = history.some(
    (h) =>
      h.role === "assistant" &&
      /habitaciones libres|disponible\(s\)|perm[ií]tame revisar/i.test(h.content)
  );

  if (
    stay.availableOnly ||
    parseStayDurationNights(message) != null ||
    /disponib|libre|habitaci|quiero|para el|para la|me quedo|desde el|\bnoches?\b|\bd[ií]as?\b/i.test(
      lower
    ) ||
    hadAvailabilityChat
  ) {
    return formatAvailabilitySummary(snapshot, stay.checkIn, stay.checkOut);
  }

  return null;
}

export function formatAvailabilitySummary(
  snapshot: HotelSnapshot,
  checkIn: string,
  checkOut: string
): string {
  const available = getAvailableRooms(snapshot, checkIn, checkOut);
  const types = [...new Set(snapshot.rooms.map((r) => r.type))];
  const signOff = "¿Desea **reservar** alguna? Indíqueme nombre, fechas y huéspedes.";
  const dateLabel = formatWeekdayLabel(checkIn);

  const byType = types
    .map((type) => {
      const ofType = available.filter((r) => r.type === type);
      if (ofType.length === 0) return null;
      const prices = ofType.map((r) => r.price);
      const caps = ofType.map((r) => r.capacity);
      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const priceTxt = minP === maxP ? `S/ ${minP}` : `S/ ${minP}–${maxP}`;
      return `* **${type}:** ${ofType.length} disponible(s) · ${priceTxt}/noche · ${Math.min(...caps)}–${Math.max(...caps)} pers.`;
    })
    .filter(Boolean);

  return `Permítame revisar… Para **${dateLabel}** (1 noche, ${checkIn} → ${checkOut}):

**${available.length}** habitaciones libres de **${snapshot.rooms.length}** totales.

${byType.join("\n") || "* Sin disponibilidad en este momento."}

Para ver **números de habitación**, escriba *"dime las Estándar"* o *"lista las Doble"*. ${signOff}`;
}

export function answerRoomQuery(
  message: string,
  snapshot: HotelSnapshot,
  history: ChatMessage[] = []
): string | null {
  if (!isRoomInventoryQuery(message)) return null;

  const query = parseRoomQuery(message, history);
  const signOff = "¿Desea **reservar** alguna? Indíqueme nombre, fechas y huéspedes.";

  if (isTypeComparisonQuery(message)) {
    const summary = formatAvailabilitySummary(snapshot, query.checkIn, query.checkOut);
    return `No solo **Dobles** — estas son **todas las categorías** libres:\n\n${summary.replace(/^Permítame revisar…\n\n/, "")}`;
  }

  const wantsSummaryOnly =
    /disponib|libre|hay habitaci/i.test(message.toLowerCase()) &&
    !query.listMode;

  if (wantsSummaryOnly) {
    return formatAvailabilitySummary(snapshot, query.checkIn, query.checkOut);
  }

  const rooms = queryRooms(snapshot, query);
  const filters = buildFilterDescription(query);

  if (rooms.length === 0) {
    return `Revisé el inventario: no hay habitaciones ${filters}.

¿Ajustamos fechas, piso, precio o capacidad? ${signOff}`;
  }

  const summary = formatRoomQuerySummary(rooms);

  return `Claro, le detallo las habitaciones ${filters} (**${rooms.length}**):

${formatRoomList(rooms)}

${summary}

${signOff}`;
}

export function buildRoomCatalogForPrompt(snapshot: HotelSnapshot): string {
  const types = [...new Set(snapshot.rooms.map((r) => r.type))];
  const floors = [...new Set(snapshot.rooms.map((r) => r.floor))].sort(
    (a, b) => Number(a) - Number(b)
  );

  const typeStats = types.map((type) => {
    const ofType = snapshot.rooms.filter((r) => r.type === type);
    const prices = ofType.map((r) => r.price);
    const caps = ofType.map((r) => r.capacity);
    return `- ${type}: ${ofType.length} hab. · S/${Math.min(...prices)}–S/${Math.max(...prices)} · capacidad ${Math.min(...caps)}–${Math.max(...caps)} pers.`;
  });

  const floorStats = floors.map((f) => {
    const onFloor = snapshot.rooms.filter((r) => r.floor === f);
    return `- Piso ${f}: ${onFloor.length} hab. (${[...new Set(onFloor.map((r) => r.type))].join(", ")})`;
  });

  return `INVENTARIO COMPLETO (${snapshot.rooms.length} habitaciones):
Por tipo:
${typeStats.join("\n")}
Por piso:
${floorStats.join("\n")}
Liste habitaciones filtrando por disponibilidad, piso, precio, tipo o capacidad según la consulta.`;
}
