import type { BookingIntent, ChatMessage } from "./receptionist-types.js";
import { parseStayDates, parseStayDatesFromUserHistory } from "./receptionist-dates.js";
import { detectRoomTypeLabel, isBareRoomTypeChoice, isInventoryListRequest } from "./receptionist-rooms.js";
import { parseBareRoomNumber, parseRoomNumber } from "./receptionist-room-detail.js";

export interface BookingConversationContext {
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  roomType?: string;
  roomNumber?: string;
  inBookingFlow: boolean;
  missing: Array<"name" | "guests" | "checkOut" | "room">;
}

export function parseGuestCount(text: string, allowBare = false): number | undefined {
  const lower = text.toLowerCase().trim();
  const patterns = [
    /(?:somos|seremos|s(?:e|o)?mos|para|y)\s*(\d+)\s*(?:personas?|hu[eé]spedes?|pers\.?)/i,
    /(\d+)\s*(?:personas?|hu[eé]spedes?|pers\.?)\s*$/i,
    /\b(?:y\s+)?(?:somos|seremos)\s+(\d+)\s*$/i,
  ];
  for (const re of patterns) {
    const m = lower.match(re);
    if (m) return parseInt(m[1], 10);
  }
  if (allowBare && /^\d{1,2}$/.test(lower)) {
    const n = parseInt(lower, 10);
    if (n >= 1 && n <= 20) return n;
  }
  return undefined;
}

function isLikelyNotAName(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (
    /^(?:hola|hey|hi|hello|saludos|buenas?(?:\s+(?:tardes|d[ií]as|noches))?|buenos?\s+d[ií]as|buenas?\s+tardes|buenas?\s+noches|si|s[ií]|ok|gracias|quiero|seguir|disculpe|perd[oó]n)$/i.test(
      t
    )
  ) {
    return true;
  }
  if (/reserv|habitaci|disponib|precio|ma[nñ]ana|hoy/i.test(t)) return true;
  return false;
}

function parseGuestName(text: string): string | undefined {
  const trimmed = text.trim();
  const named = trimmed.match(
    /(?:me llamo|soy|mi nombre(?:\s+completo)?(?:\s+es)?)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][\w\s.'-]{2,60})/i
  );
  if (named && !isLikelyNotAName(named[1])) return named[1].trim();

  const commaDate = trimmed.match(/^([A-ZÁÉÍÓÚÑa-záéíóúñ][\w\s.'-]{2,60}),\s*\d/);
  if (commaDate && !isLikelyNotAName(commaDate[1])) return commaDate[1].trim();

  const commaBooking = trimmed.match(
    /^([A-ZÁÉÍÓÚÑa-záéíóúñ][\w\s.'-]{2,60}),\s*(?:reserv|quiero|deseo|necesito|me gustar|para el|del \d)/i
  );
  if (commaBooking && !isLikelyNotAName(commaBooking[1])) return commaBooking[1].trim();

  const bare = parseBareName(trimmed);
  return bare && !isLikelyNotAName(bare) ? bare : undefined;
}

export { parseGuestName };

export function parseBareName(text: string): string | undefined {
  const t = text.trim();
  if (t.length < 3 || t.length > 60) return undefined;
  if (/\d|@|habitaci|reserv|disponib|precio|\?|¿|\/|\\/.test(t)) return undefined;
  if (/^(?:hola|si|sí|ok|gracias|buenas|hey|quiero|seguir)$/i.test(t)) return undefined;
  if (/^(?:est[aá]ndar|standard|doble|suite|premium|lumina)$/i.test(t)) return undefined;
  if (/^[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+){1,4}$/u.test(t)) return t;
  return undefined;
}

export type AwaitingBookingField = "name" | "guests" | "roomNumber" | "confirm";

export function isAwaitingBookingInput(history: ChatMessage[]): AwaitingBookingField | null {
  const last = [...history].reverse().find((h) => h.role === "assistant");
  if (!last) return null;
  const c = last.content.toLowerCase();
  if (/nombre completo|su nombre|me indica su nombre|indique su nombre/i.test(c)) return "name";
  if (/cu[aá]ntas personas|n[uú]mero de hu[eé]spedes|personas ser[aá]n/i.test(c)) return "guests";
  if (/n[uú]mero de habitaci|qu[eé] n[uú]mero/i.test(c)) return "roomNumber";
  if (/s[ií], confirmo|confirmar la reserva|est[aá] conforme/i.test(c)) return "confirm";
  return null;
}

/** Nombre en flujo de reserva; acepta un solo nombre si recepción lo acaba de pedir. */
export function parseNameReply(text: string, allowSingle = false): string | undefined {
  const explicit = parseGuestName(text);
  if (explicit) return explicit;
  if (allowSingle) {
    const t = text.trim();
    if (
      t.length >= 2 &&
      t.length <= 40 &&
      /^[A-Za-zÀ-ú][\wáéíóúñ'-]*$/u.test(t) &&
      !detectRoomTypeLabel(t)
    ) {
      return t;
    }
  }
  return parseBareName(text);
}

function shouldAllowSingleName(
  text: string,
  isCurrent: boolean,
  awaiting: AwaitingBookingField | null,
  inBookingFlow: boolean
): boolean {
  if (isCurrent && awaiting === "name") return true;
  if (!inBookingFlow) return false;
  const t = text.trim();
  if (detectRoomTypeLabel(t) || parseBareRoomNumber(t) || parseGuestCount(t, true)) return false;
  if (/^\d+$/.test(t)) return false;
  return /^[A-Za-zÀ-ú][\wáéíóúñ'-]{1,39}$/u.test(t);
}

function parseEmail(text: string): string | undefined {
  return text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/)?.[0];
}

function parsePhone(text: string): string | undefined {
  return text.match(/(?:\+?\d[\d\s-]{7,}\d)/)?.[0]?.trim();
}

export function isBookingFlowMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /reserv|booking|hosped|apartar|seguir con la reserva|continuar (?:con )?(?:la )?reserva|quiero reservar/i.test(
      lower
    ) || Boolean(parseBareName(message.trim()))
  );
}

export function buildBookingContext(
  message: string,
  history: ChatMessage[] = []
): BookingConversationContext {
  const userTexts = [
    ...history.filter((h) => h.role === "user").slice(-10),
    { role: "user" as const, content: message },
  ];
  const combined = userTexts.map((h) => h.content).join(" ");
  const awaiting = isAwaitingBookingInput(history);
  const dates = parseStayDatesFromUserHistory(history, message);

  const inBookingFlow =
    /reserv|booking|hosped|apartar|seguir con la reserva|continuar (?:con )?(?:la )?reserva/i.test(
      combined
    ) ||
    userTexts.some((h) => Boolean(parseBareName(h.content.trim()))) ||
    awaiting != null ||
    (Boolean(dates.checkIn) &&
      userTexts.some(
        (h) => isBareRoomTypeChoice(h.content) && !isInventoryListRequest(h.content)
      ));

  let guestName: string | undefined;
  let guests: number | undefined;
  let guestEmail: string | undefined;
  let guestPhone: string | undefined;

  for (let i = userTexts.length - 1; i >= 0; i--) {
    const t = userTexts[i].content;
    const isCurrent = i === userTexts.length - 1;
    if (
      !detectRoomTypeLabel(t) &&
      !parseRoomNumber(t) &&
      !parseBareRoomNumber(t) &&
      !/^(?:s[ií],?\s*confirmo|confirmo)$/i.test(t.trim())
    ) {
      guestName ||= parseNameReply(
        t,
        shouldAllowSingleName(t, isCurrent, awaiting, inBookingFlow)
      );
    }
    guests ||= parseGuestCount(t, true);
    guestEmail ||= parseEmail(t);
    guestPhone ||= parsePhone(t);
  }
  let roomType: string | undefined;
  let roomNumber: string | undefined;

  for (let i = userTexts.length - 1; i >= 0; i--) {
    roomType ||= detectRoomTypeLabel(userTexts[i].content);
    roomNumber ||= parseRoomNumber(userTexts[i].content) ?? parseBareRoomNumber(userTexts[i].content) ?? undefined;
  }

  const missing: BookingConversationContext["missing"] = [];
  if (!guestName) missing.push("name");
  if (!guests) missing.push("guests");
  if (!dates.checkIn) missing.push("checkOut");
  if (!roomType && !roomNumber) missing.push("room");

  return {
    guestName,
    guestEmail,
    guestPhone,
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    guests,
    roomType,
    roomNumber,
    inBookingFlow,
    missing,
  };
}

export function bookingContextToIntent(ctx: BookingConversationContext): Partial<BookingIntent> | null {
  if (!ctx.checkIn || !ctx.checkOut) return null;
  return {
    guestName: ctx.guestName,
    guestEmail: ctx.guestEmail,
    guestPhone: ctx.guestPhone,
    checkIn: ctx.checkIn,
    checkOut: ctx.checkOut,
    guests: ctx.guests,
    roomType: ctx.roomType,
    roomNumber: ctx.roomNumber,
  };
}

export function renderBookingProgressPrompt(ctx: BookingConversationContext): string {
  const parts: string[] = [];

  if (ctx.guestName) parts.push(`**${ctx.guestName}**`);
  if (ctx.checkIn && ctx.checkOut) parts.push(`del **${ctx.checkIn}** al **${ctx.checkOut}**`);
  if (ctx.guests) parts.push(`**${ctx.guests}** huéspedes`);
  if (ctx.roomNumber) parts.push(`Hab. **${ctx.roomNumber}**`);
  else if (ctx.roomType) parts.push(`tipo **${ctx.roomType}**`);

  const summary = parts.length > 0 ? parts.join(" · ") : "su reserva";

  if (ctx.missing.includes("checkOut") || !ctx.checkIn) {
    return `Con gusto, **${ctx.guestName ?? "estimado huésped"}**. ¿Para qué **fecha de entrada y salida** desea reservar? (Ej.: *miércoles 10/06 al viernes 12/06* o *3 noches*)`;
  }
  if (ctx.missing.includes("name")) {
    const stay =
      ctx.checkIn && ctx.checkOut
        ? ` Anoto su estadía del **${ctx.checkIn}** al **${ctx.checkOut}**.`
        : "";
    return `Con gusto le ayudo con la reserva.${stay} ¿Me indica su **nombre completo**?`;
  }
  if (ctx.missing.includes("guests")) {
    return `Gracias, **${ctx.guestName}**. Para el **${ctx.checkIn}** al **${ctx.checkOut}**, ¿cuántas **personas** serán?`;
  }
  if (ctx.missing.includes("room")) {
    return `Anotado, **${ctx.guestName}** · **${ctx.checkIn}** → **${ctx.checkOut}** · **${ctx.guests}** pers.

Permítame mostrarle las **opciones disponibles** con precios e incluidos…`;
  }

  return `Retomamos ${summary}. Elija habitación y responda **"sí, confirmo"** para el enlace de pago.`;
}
