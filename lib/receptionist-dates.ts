import { addDays, format, nextDay } from "date-fns";

export interface ParsedStayDates {
  checkIn: string;
  checkOut: string;
  availableOnly: boolean;
}

const WEEKDAY_MAP: Array<{ re: RegExp; day: 0 | 1 | 2 | 3 | 4 | 5 | 6 }> = [
  { re: /domingo/, day: 0 },
  { re: /lunes/, day: 1 },
  { re: /martes/, day: 2 },
  { re: /mi[eé]rcoles/, day: 3 },
  { re: /jueves/, day: 4 },
  { re: /viernes/, day: 5 },
  { re: /s[aá]bado/, day: 6 },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseWeekdayCheckIn(text: string, ref = new Date()): string | null {
  const lower = normalize(text);
  for (const { re, day } of WEEKDAY_MAP) {
    if (!re.test(lower)) continue;
    const today = ref.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    if (today === day) return format(ref, "yyyy-MM-dd");
    return format(nextDay(ref, day), "yyyy-MM-dd");
  }
  return null;
}

export function parseStayDurationNights(text: string): number | undefined {
  const m =
    text.match(/(?:me quedo|quedarme|estancia|hospedaje|por)\s*(?:de)?\s*(\d+)\s*(?:d[ií]as?|noches?)/i) ||
    text.match(/(\d+)\s*(?:d[ií]as?|noches?)(?:\s+de estancia)?/i);
  return m ? parseInt(m[1], 10) : undefined;
}

/** Fechas de estadía a partir de lenguaje natural (compartido por reservas e inventario). */
export function parseStayDates(text: string, ref = new Date()): Partial<ParsedStayDates> {
  const lower = text.toLowerCase();
  const availableOnly = /disponib|libre|libres|ocupad|vacant|hay habitaci/i.test(lower);
  const tomorrowIn = format(addDays(ref, 1), "yyyy-MM-dd");
  const tomorrowOut = format(addDays(ref, 2), "yyyy-MM-dd");
  const todayIn = format(ref, "yyyy-MM-dd");
  const todayOut = format(addDays(ref, 1), "yyyy-MM-dd");
  const pasadoIn = format(addDays(ref, 2), "yyyy-MM-dd");
  const pasadoOut = format(addDays(ref, 3), "yyyy-MM-dd");

  let checkIn: string | undefined;
  let checkOut: string | undefined;

  if (/\bhoy\b/.test(lower)) checkIn = todayIn;
  else if (/\bpasado\s+ma[nñ]ana\b/.test(lower)) checkIn = pasadoIn;
  else if (/\bma[nñ]ana\b/.test(lower)) checkIn = tomorrowIn;
  else {
    const weekday = parseWeekdayCheckIn(text, ref);
    if (weekday) checkIn = weekday;
  }

  const iso = text.match(/(\d{4}-\d{2}-\d{2})/g);
  if (iso && iso.length >= 2) {
    checkIn = iso[0];
    checkOut = iso[1];
  } else if (iso?.length === 1) {
    checkIn = iso[0];
  }

  const dmy = [...text.matchAll(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g)];
  if (dmy.length >= 2) {
    const toIso = (m: RegExpMatchArray) =>
      `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    checkIn = toIso(dmy[0]);
    checkOut = toIso(dmy[1]);
  } else if (dmy.length === 1) {
    const toIso = (m: RegExpMatchArray) =>
      `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    checkIn = toIso(dmy[0]);
  }

  const nights = parseStayDurationNights(text);
  if (checkIn && nights && !checkOut) {
    checkOut = format(addDays(new Date(`${checkIn}T12:00:00`), nights), "yyyy-MM-dd");
  }

  if (checkIn && !checkOut) {
    const range = lower.match(
      /(?:al|hasta|a)\s+(?:el\s+)?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)/
    );
    if (range && checkIn) {
      const endDay = parseWeekdayCheckIn(range[1], ref);
      if (endDay && endDay > checkIn) {
        checkOut = endDay;
      } else {
        checkOut = format(addDays(new Date(`${checkIn}T12:00:00`), 1), "yyyy-MM-dd");
      }
    } else {
      checkOut = format(addDays(new Date(`${checkIn}T12:00:00`), 1), "yyyy-MM-dd");
    }
  }

  if (!checkIn) return { availableOnly };

  return { checkIn, checkOut: checkOut!, availableOnly: availableOnly || Boolean(checkIn && /disponib|libre|reserv|para el/i.test(lower)) };
}

export function parseStayDatesFromUserHistory(
  history: Array<{ role: string; content: string }>,
  message: string,
  ref = new Date()
): Partial<ParsedStayDates> {
  const sources = [
    message,
    ...history
      .filter((h) => h.role === "user")
      .slice(-8)
      .reverse()
      .map((h) => h.content),
  ];

  for (const text of sources) {
    const parsed = parseStayDates(text, ref);
    if (parsed.checkIn) return parsed;
  }

  return {};
}

export function formatWeekdayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  const names = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return `${names[d.getDay()]} ${isoDate}`;
}
