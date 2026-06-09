import type { BookingIntent, ChatMessage, HotelSnapshot } from "./receptionist-types.js";
import { computeStayNights, isRoomAvailable } from "./receptionist-context.js";
import {
  findAvailableRoom,
  detectRoomTypeLabel,
  getAvailableRooms,
  isRoomInventoryQuery,
  isInventoryListRequest,
  isTypeComparisonQuery,
  type RoomRow,
} from "./receptionist-rooms.js";
import {
  findRoomByNumber,
  parseRoomNumber,
  parseBareRoomNumber,
  getRoomDisplayAmenities,
} from "./receptionist-room-detail.js";
import { parseStayDates, formatWeekdayLabel } from "./receptionist-dates.js";
import {
  buildBookingContext,
  bookingContextToIntent,
  renderBookingProgressPrompt,
  parseBareName,
  parseGuestCount,
  parseGuestName,
  parseNameReply,
  isAwaitingBookingInput,
  type BookingConversationContext,
} from "./receptionist-conversation.js";

function parseEmail(text: string): string | undefined {
  return text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/)?.[0];
}

function parsePhone(text: string): string | undefined {
  return text.match(/(?:\+?\d[\d\s-]{7,}\d)/)?.[0]?.trim();
}

function parseBudgetMax(text: string): number | undefined {
  const m =
    text.match(/(?:presupuesto|hasta|m[aá]ximo|menos de)\s*s?\/?\s*(\d+)/i) ||
    text.match(/s?\/?\s*(\d+)\s*(?:soles|m[aá]ximo)/i);
  return m ? parseInt(m[1], 10) : undefined;
}

function inferRoomNumber(message: string, history: ChatMessage[]): string | undefined {
  const fromMessage = parseRoomNumber(message) ?? parseBareRoomNumber(message);
  if (fromMessage) return fromMessage;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;
    const n = parseRoomNumber(history[i].content) ?? parseBareRoomNumber(history[i].content);
    if (n) return n;
  }
  return undefined;
}

function inferRoomTypeFromHistory(history: ChatMessage[], message: string): string | undefined {
  if (detectRoomTypeLabel(message)) return detectRoomTypeLabel(message)!;
  if (/m[aá]s econ[oó]mica|precio accesible|m[aá]s barata/i.test(message.toLowerCase())) {
    return "Estándar";
  }
  const combined = history
    .slice(-6)
    .map((h) => h.content)
    .join(" ");
  return detectRoomTypeLabel(combined) ?? undefined;
}

export function isConfirmationMessage(message: string): boolean {
  return /^(?:s[ií]|confirmo|confirmar|adelante|ok|de acuerdo|apartar|reservar|proceda|listo)[\s,!.:]|s[ií],?\s*confirmo/i.test(
    message.trim().toLowerCase()
  );
}

function isAwaitingConfirmation(history: ChatMessage[]): boolean {
  const last = [...history].reverse().find((h) => h.role === "assistant");
  return last
    ? /Si est[aá] conforme|s[ií], confirmo|enlace del adelanto/i.test(last.content)
    : false;
}

function isRoomSelectionMessage(message: string): boolean {
  if (isInventoryListRequest(message)) return false;
  const lower = message.toLowerCase();
  return (
    Boolean(detectRoomTypeLabel(message)) ||
    Boolean(parseRoomNumber(message)) ||
    Boolean(parseBareRoomNumber(message)) ||
    /m[aá]s econ[oó]mica|precio accesible|m[aá]s barata|presupuesto|hasta s?\/?\s*\d+|la estandar|la doble|una suite/i.test(
      lower
    )
  );
}

function parseRoomNumberFromMessage(message: string): string | undefined {
  return parseRoomNumber(message) ?? parseBareRoomNumber(message) ?? undefined;
}

function roomsOfTypeAvailable(
  snapshot: HotelSnapshot,
  ctx: BookingConversationContext,
  roomType: string,
  budgetMax?: number
) {
  let available = getAvailableRooms(snapshot, ctx.checkIn!, ctx.checkOut!).filter(
    (r) => r.capacity >= ctx.guests! && r.type === roomType
  );
  if (budgetMax != null) {
    available = available.filter((r) => r.price <= budgetMax);
  }
  available.sort(
    (a, b) => a.price - b.price || a.number.localeCompare(b.number, undefined, { numeric: true })
  );
  return available;
}

export function renderAvailableRoomNumbersForType(
  snapshot: HotelSnapshot,
  ctx: BookingConversationContext,
  roomType: string,
  budgetMax?: number
): string {
  const available = roomsOfTypeAvailable(snapshot, ctx, roomType, budgetMax);
  const dateLabel = formatWeekdayLabel(ctx.checkIn!);

  if (available.length === 0) {
    return `Lo siento, **${ctx.guestName}**: no hay habitaciones **${roomType}** libres para **${dateLabel}**${budgetMax ? ` hasta **S/ ${budgetMax}**` : ""}.

¿Prefiere otro **tipo**, otra **fecha** o un **presupuesto** distinto?`;
  }

  const lines = available.map((r) => {
    const amenities = getRoomDisplayAmenities(r).slice(0, 3).join(", ");
    return `* **Hab. ${r.number}** — Piso **${r.floor}** · **S/ ${r.price}**/noche · ${amenities}…`;
  });

  return `Perfecto, **${roomType}**. Para **${dateLabel}** (${ctx.checkIn} → ${ctx.checkOut}), **${ctx.guests}** personas, estas **${roomType}** están **libres**:

${lines.join("\n")}

¿Qué **número de habitación** desea reservar? (Ej.: *"103"* o *"habitación 117"*)`;
}

function renderRoomUnavailableWithAlternatives(
  snapshot: HotelSnapshot,
  ctx: BookingConversationContext,
  roomNumber: string,
  roomType?: string,
  budgetMax?: number
): string {
  const known = findRoomByNumber(snapshot, roomNumber);
  const type = known?.type ?? roomType;
  const dateLabel = formatWeekdayLabel(ctx.checkIn!);

  let intro = `La **Hab. ${roomNumber}** no está disponible para **${dateLabel}** (${ctx.checkIn} → ${ctx.checkOut}).`;
  if (known && /reservad|ocupad/i.test(known.status)) {
    intro += " Esa habitación ya figura **reservada** en nuestro sistema.";
  }
  intro += "\n\n";

  if (type) {
    const alternatives = roomsOfTypeAvailable(snapshot, ctx, type, budgetMax);
    if (alternatives.length === 0) {
      return `${intro}Tampoco hay otras **${type}** libres en esas fechas. ¿Le muestro **otros tipos** disponibles?`;
    }
    const lines = alternatives.map(
      (r) => `* **Hab. ${r.number}** — Piso **${r.floor}** · **S/ ${r.price}**/noche`
    );
    return `${intro}Estas **${type}** sí están **libres**:

${lines.join("\n")}

¿Cuál **número** prefiere?`;
  }

  return `${intro}¿Le muestro las **opciones disponibles**?`;
}

function isRoomStatusAvailable(room: RoomRow): boolean {
  return (
    room.status !== "Mantenimiento" &&
    room.status !== "En limpieza" &&
    !/reservad|ocupad/i.test(room.status)
  );
}

function resolveRoomForBooking(
  partial: Partial<BookingIntent>,
  snapshot: HotelSnapshot
): ReturnType<typeof findAvailableRoom> {
  if (partial.roomNumber) {
    const specific = findRoomByNumber(snapshot, partial.roomNumber);
    if (
      specific &&
      partial.guests! <= specific.capacity &&
      isRoomStatusAvailable(specific) &&
      isRoomAvailable(snapshot, specific.id, partial.checkIn!, partial.checkOut!)
    ) {
      return specific;
    }
    return null;
  }
  return findAvailableRoom(
    snapshot,
    partial.checkIn!,
    partial.checkOut!,
    partial.guests!,
    partial.roomType
  );
}

function formatRoomNumberPreview(rooms: RoomRow[], maxPreview = 5): string {
  const sorted = [...rooms].sort((a, b) =>
    a.number.localeCompare(b.number, undefined, { numeric: true })
  );
  if (sorted.length === 0) return "";
  if (sorted.length <= maxPreview) {
    return sorted.map((r) => r.number).join(", ");
  }
  const preview = sorted.slice(0, maxPreview).map((r) => r.number).join(", ");
  return `${preview}… (+${sorted.length - maxPreview} más)`;
}

export function renderBookingRoomOptions(
  snapshot: HotelSnapshot,
  ctx: BookingConversationContext,
  budgetMax?: number
): string {
  let available = getAvailableRooms(snapshot, ctx.checkIn!, ctx.checkOut!).filter(
    (r) => r.capacity >= ctx.guests!
  );

  if (budgetMax != null) {
    available = available.filter((r) => r.price <= budgetMax);
  }

  const types = [...new Set(available.map((r) => r.type))];
  const dateLabel = formatWeekdayLabel(ctx.checkIn!);

  if (types.length === 0) {
    return `Lo siento, **${ctx.guestName}**: no hay habitaciones${budgetMax ? ` hasta **S/ ${budgetMax}**` : ""} libres para **${dateLabel}** con **${ctx.guests}** personas.

¿Prefiere otra fecha o un presupuesto distinto?`;
  }

  const lines = types.map((type) => {
    const ofType = available.filter((r) => r.type === type);
    const sample = ofType[0];
    const amenities = getRoomDisplayAmenities(sample).slice(0, 4).join(", ");
    const min = Math.min(...ofType.map((r) => r.price));
    const numberPreview = formatRoomNumberPreview(ofType);
    const numbersLine = numberPreview
      ? `\n  Algunos números libres: **${numberPreview}**`
      : "";
    return `* **${type}** — desde **S/ ${min}**/noche · **${ofType.length}** libre(s)${numbersLine}\n  Incluye: ${amenities}…`;
  });

  return `Gracias, **${ctx.guestName}**. Para **${dateLabel}** (${ctx.checkIn} → ${ctx.checkOut}), **${ctx.guests}** personas, estas categorías tienen disponibilidad:

${lines.join("\n\n")}

Primero elija el **tipo** que le interese (Ej.: *"Estándar"*, *"Doble"*, *"Suite"* o *"hasta S/ 120"*).

Enseguida le muestro **todos los números libres** de esa categoría para que elija el que prefiera, y después confirmamos la reserva.`;
}

function renderRoomConfirmationPreview(
  room: NonNullable<ReturnType<typeof findAvailableRoom>>,
  partial: Partial<BookingIntent>
): string {
  const nights = computeStayNights(partial.checkIn!, partial.checkOut!);
  const total = room.price * nights;
  const deposit = Math.round(total * 0.1 * 100) / 100;
  const amenities = getRoomDisplayAmenities(room).map((a) => `* ${a}`).join("\n");

  return `Excelente elección, **${partial.guestName}**:

**Hab. ${room.number}** — ${room.name} · **${room.type}** · Piso **${room.floor}**
* **${nights}** noche(s) · **S/ ${total}** total · adelanto **10%: S/ ${deposit}**

**¿Qué incluye esta habitación?** (ficha web)
${amenities}

Si está conforme, responda **"sí, confirmo"** y le envío el enlace del adelanto. Si prefiere otra, indíqueme el tipo o número.`;
}

export function isBookingMessage(message: string): boolean {
  const lower = message.toLowerCase();
  const stay = parseStayDates(message);
  const hasDates = Boolean(stay.checkIn && stay.checkOut);
  const hasGuestCount = parseGuestCount(message, true) != null;
  const hasName = Boolean(parseGuestName(message));
  const hasBookingWord = /reserv|confirm|apart|booking|hosped/i.test(lower);
  const isListing =
    /^(?:dime|lista|mu[eé]str|cu[aá]les|qu[eé] habitaci|habitaciones disponib)/i.test(lower.trim());

  if (isListing) return false;
  if (hasDates && (hasGuestCount || hasName || hasBookingWord)) return true;
  if (hasName && hasGuestCount && /(?:al|hasta|del)\s*\d{1,2}[\/\-]/.test(message)) return true;
  return false;
}

export function parseBookingFromMessage(
  message: string,
  history: ChatMessage[] = []
): Partial<BookingIntent> | null {
  if (!isBookingMessage(message)) return null;
  const stay = parseStayDates(message);
  if (!stay.checkIn || !stay.checkOut) return null;

  return {
    guestName: parseGuestName(message),
    guestEmail: parseEmail(message),
    guestPhone: parsePhone(message),
    roomType: inferRoomTypeFromHistory(history, message),
    roomNumber: inferRoomNumber(message, history),
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    guests: parseGuestCount(message, true),
  };
}

function finalizeBookingReply(
  partial: Partial<BookingIntent>,
  snapshot: HotelSnapshot
): string | null {
  if (!partial.checkIn || !partial.checkOut || !partial.guestName || !partial.guests) return null;

  const nights = computeStayNights(partial.checkIn, partial.checkOut);
  if (nights <= 0) {
    return "Las fechas no son válidas: el check-out debe ser **después** del check-in. ¿Me las confirma?";
  }

  if (!partial.roomNumber) {
    return null;
  }

  const room = resolveRoomForBooking(partial, snapshot);

  if (!room) {
    const typeHint = partial.roomType ? ` tipo **${partial.roomType}**` : "";
    const numHint = partial.roomNumber ? ` Hab. **${partial.roomNumber}**` : "";
    return `Lo siento, **${partial.guestName}**:${numHint} no está disponible${typeHint} del **${partial.checkIn}** al **${partial.checkOut}**.

¿Le muestro **otras opciones** disponibles?`;
  }

  const total = room.price * nights;
  const deposit = Math.round(total * 0.1 * 100) / 100;
  const intent: BookingIntent = {
    guestName: partial.guestName,
    guestEmail: partial.guestEmail,
    guestPhone: partial.guestPhone,
    roomType: room.type,
    roomNumber: room.number,
    checkIn: partial.checkIn,
    checkOut: partial.checkOut,
    guests: partial.guests,
  };

  return `Perfecto, **${partial.guestName}**. Queda confirmada **Hab. ${room.number}** — ${room.name}, del **${partial.checkIn}** al **${partial.checkOut}** para **${partial.guests}** huéspedes.

* **${nights}** noche(s) · Total **S/ ${total}** · Adelanto **10%: S/ ${deposit}**

[RESERVA_LISTA]${JSON.stringify(intent)}[/RESERVA_LISTA]`;
}

function handleActiveBooking(
  message: string,
  history: ChatMessage[],
  snapshot: HotelSnapshot,
  ctx: BookingConversationContext
): string | null {
  const fromContext = bookingContextToIntent(ctx);
  if (!fromContext?.checkIn || !fromContext.checkOut || !fromContext.guestName) {
    return renderBookingProgressPrompt(ctx);
  }

  if (!fromContext.guests) {
    return renderBookingProgressPrompt(ctx);
  }

  const budget = parseBudgetMax(message);
  const roomNumberFromMessage = parseRoomNumberFromMessage(message);

  if (isAwaitingConfirmation(history) && isConfirmationMessage(message)) {
    if (!fromContext.roomNumber) {
      if (fromContext.roomType) {
        return renderAvailableRoomNumbersForType(
          snapshot,
          ctx,
          fromContext.roomType,
          budget ?? undefined
        );
      }
      return renderBookingRoomOptions(snapshot, ctx, budget ?? undefined);
    }
    return finalizeBookingReply(fromContext, snapshot);
  }

  if (roomNumberFromMessage) {
    const partial = { ...fromContext, roomNumber: roomNumberFromMessage };
    const room = resolveRoomForBooking(partial, snapshot);
    if (!room) {
      return renderRoomUnavailableWithAlternatives(
        snapshot,
        ctx,
        roomNumberFromMessage,
        fromContext.roomType,
        budget ?? undefined
      );
    }
    return renderRoomConfirmationPreview(room, partial);
  }

  if (fromContext.roomType && !fromContext.roomNumber) {
    if (detectRoomTypeLabel(message) || budget != null) {
      const type = detectRoomTypeLabel(message) ?? fromContext.roomType;
      return renderAvailableRoomNumbersForType(snapshot, ctx, type, budget ?? undefined);
    }
    return renderAvailableRoomNumbersForType(
      snapshot,
      ctx,
      fromContext.roomType,
      budget ?? undefined
    );
  }

  if (!fromContext.roomType && !fromContext.roomNumber) {
    return renderBookingRoomOptions(snapshot, ctx, budget ?? undefined);
  }

  if (fromContext.roomNumber) {
    const room = resolveRoomForBooking(fromContext, snapshot);
    if (!room) {
      return renderRoomUnavailableWithAlternatives(
        snapshot,
        ctx,
        fromContext.roomNumber,
        fromContext.roomType,
        budget ?? undefined
      );
    }
    if (isAwaitingConfirmation(history)) {
      return `¿Desea **confirmar** la reserva de la **Hab. ${fromContext.roomNumber}**? Responda **"sí, confirmo"** o elija otro número.`;
    }
    return renderRoomConfirmationPreview(room, fromContext);
  }

  return renderBookingRoomOptions(snapshot, ctx, budget ?? undefined);
}

export function tryFallbackBookingReply(
  message: string,
  snapshot: HotelSnapshot,
  history: ChatMessage[] = []
): string | null {
  const lower = message.toLowerCase();
  if (isRoomInventoryQuery(message) && isInventoryListRequest(message)) {
    return null;
  }

  const ctx = buildBookingContext(message, history);
  const isInventory = isRoomInventoryQuery(message) || isTypeComparisonQuery(message);

  const awaiting = isAwaitingBookingInput(history);

  const hasBookingHistory = history.some(
    (h) =>
      h.role === "user" &&
      (/reserv|booking|hosped|apartar/i.test(h.content) ||
        Boolean(parseBareName(h.content.trim())) ||
        /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(h.content))
  );

  const isBookingContinuation =
    (ctx.inBookingFlow || hasBookingHistory || awaiting != null) &&
    (Boolean(parseBareName(message.trim())) ||
      Boolean(parseNameReply(message, awaiting === "name")) ||
      parseGuestCount(message, true) != null ||
      isRoomSelectionMessage(message) ||
      isConfirmationMessage(message) ||
      /seguir con la reserva|continuar (?:con )?(?:la )?reserva/i.test(lower) ||
      (/reserv/i.test(lower) && !/disponib|qu[eé] habitaci|otras habitaci/i.test(lower)));

  if (isInventory && !isBookingContinuation) return null;

  const wantsBooking =
    ctx.inBookingFlow ||
    awaiting != null ||
    /reserv|seguir con la reserva|continuar (?:con )?(?:la )?reserva|apartar/i.test(lower) ||
    Boolean(parseBareName(message.trim())) ||
    Boolean(parseNameReply(message, awaiting === "name")) ||
    isRoomSelectionMessage(message) ||
    isConfirmationMessage(message);

  if (wantsBooking) {
    return handleActiveBooking(message, history, snapshot, ctx);
  }

  const partial = parseBookingFromMessage(message, history);
  if (!partial?.checkIn || !partial.checkOut) return null;

  if (!partial.guestName) {
    return `Perfecto, anoto su estadía del **${partial.checkIn}** al **${partial.checkOut}**${partial.guests ? ` para **${partial.guests}** huéspedes` : ""}. ¿Me indica su **nombre completo**?`;
  }

  if (!partial.guests || partial.guests < 1) {
    return `Gracias, **${partial.guestName}**. Para el **${partial.checkIn}** al **${partial.checkOut}**, ¿cuántas **personas** serán?`;
  }

  return renderBookingRoomOptions(snapshot, {
    ...ctx,
    guestName: partial.guestName,
    guests: partial.guests,
    checkIn: partial.checkIn,
    checkOut: partial.checkOut,
  });
}
