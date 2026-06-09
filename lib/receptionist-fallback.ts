import type { ChatMessage, HotelSnapshot, KnowledgeEntry } from "./receptionist-types.js";
import { answerDateAvailabilityQuery, answerRoomQuery } from "./receptionist-rooms.js";
import { tryFallbackBookingReply } from "./receptionist-booking-parse.js";
import {
  answerRoomDetailQuery,
  answerHotelServicesQuery,
} from "./receptionist-room-detail.js";
import {
  buildBookingContext,
  renderBookingProgressPrompt,
} from "./receptionist-conversation.js";

/** Respuesta dinámica con datos en vivo cuando Gemini no está disponible */
export function generateFallbackReply(
  message: string,
  snapshot: HotelSnapshot,
  knowledge: KnowledgeEntry[] = [],
  history: ChatMessage[] = []
): string {
  const lower = message.toLowerCase();
  const { config, rooms } = snapshot;
  const name = config.name;

  const floors = [...new Set(rooms.map((r) => r.floor))].sort(
    (a, b) => Number(a) - Number(b)
  );
  const types = [...new Set(rooms.map((r) => r.type))];

  const signOff = "¿Desea **reservar** alguna? Indíqueme nombre, fechas y huéspedes.";

  if (/^hola|buenas|buenos|saludos|hey/i.test(lower)) {
    const hour = new Date().getHours();
    let saludo = "Buenos días";
    if (/buenas noches/i.test(lower) || hour >= 19 || hour < 6) saludo = "Buenas noches";
    else if (hour >= 12) saludo = "Buenas tardes";
    return `${saludo}, le saluda **Valentina** de recepción de ${name}. ¿En qué puedo ayudarle hoy?`;
  }

  if (
    /precio|precios|tarifa|tarifas|cu[aá]nto cuesta|costo/i.test(lower) &&
    !/habitaci|dime|lista|cu[aá]les|cuales|piso\s*\d|\d+\s*(?:pers|personas)/i.test(lower)
  ) {
    const lines = types.map((type) => {
      const ofType = rooms.filter((r) => r.type === type);
      const prices = ofType.map((r) => r.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = min === max ? `S/ ${min}` : `S/ ${min} – S/ ${max}`;
      return `* **${type}:** ${range}/noche (${ofType.length} habitaciones)`;
    });
    return `Con gusto. Estas son nuestras tarifas por categoría:

${lines.join("\n")}

Si quiere ver **nombres y números** de habitación, dígame por ejemplo: *"dime las Estándar"* o *"habitaciones piso 2 para 4 personas"*.

*Política:* adelanto **10%** vía Stripe; saldo al llegar. ${signOff}`;
  }

  const dateAvailability = answerDateAvailabilityQuery(message, snapshot, history);
  if (dateAvailability) return dateAvailability;

  const bookingReply = tryFallbackBookingReply(message, snapshot, history);
  if (bookingReply) return bookingReply;

  const roomDetailAnswer = answerRoomDetailQuery(message, snapshot, history);
  if (roomDetailAnswer) return roomDetailAnswer;

  const servicesAnswer = answerHotelServicesQuery(message, snapshot);
  if (servicesAnswer) return servicesAnswer;

  const roomAnswer = answerRoomQuery(message, snapshot, history);
  if (roomAnswer) return roomAnswer;

  if (
    /piso|pisos|planta|nivel|elevador|ascensor/i.test(lower) &&
    !/habitaci|disponib|libre|listar|dime|cu[aá]les|cuales|\bpiso\s*\d|\d+\s*piso/i.test(lower)
  ) {
    const byFloor = floors.map((f) => {
      const onFloor = rooms.filter((r) => r.floor === f);
      const t = [...new Set(onFloor.map((r) => r.type))].join(", ");
      return `* **Piso ${f}:** ${onFloor.length} habitaciones (${t})`;
    });
    return `${name} tiene **${floors.length} pisos** (${floors.join(", ")}), ${rooms.length} habitaciones en total:

${byFloor.join("\n")}

Contamos con ascensores y recepción en planta baja. ${signOff}`;
  }

  if (
    /indicacion|indicaciones|c[oó]mo lleg|como lleg|ruta|google maps|waze|transporte p[uú]blico|desde el aeropuerto|desde el aerop/i.test(
      lower
    )
  ) {
    return `Con gusto le oriento. **${name}** está en **${config.address}** (San Isidro, Lima).

**Cómo llegar**
* **Desde el Aeropuerto Jorge Chávez:** ~35–45 min en taxi por la Vía Expresa o Av. Javier Prado.
* **En taxi o apps** (Uber, Cabify, InDrive): indique *San Isidro, Av. Lujo 123*; recepción en **planta baja**.
* **En auto:** contamos con **estacionamiento**; check-in desde las **15:00**.

Si me dice desde dónde sale (Miraflores, Centro, aeropuerto…), le detallo la ruta. También puede escribir al WhatsApp **+${config.whatsapp}** y le enviamos la ubicación en Maps.

📞 ${config.phone}`;
  }

  if (/tel[eé]fono|whatsapp|correo|email|contacto/i.test(lower) && !/llegar|indicacion|ruta/i.test(lower)) {
    return `Con gusto:

📞 **Recepción:** ${config.phone}  
💬 **WhatsApp:** +${config.whatsapp}  
✉️ **Email:** ${config.email}

Estamos en **${config.address}**. Atendemos **24 horas**. ¿Desea **indicaciones para llegar** o reservar habitación?`;
  }

  if (/ubicaci|direcci|d[oó]nde est[aá]|mapa|d[oó]nde qued/i.test(lower)) {
    return `Estamos en **${config.address}** (San Isidro, Lima).

📞 ${config.phone} · 💬 +${config.whatsapp}

¿Necesita **cómo llegar** o prefiere que le **reserve** habitación?`;
  }

  if (/spa|masaje|wellness|hidro/i.test(lower)) {
    return `Nuestro **Spa & Wellness** opera de **8:00 a.m. a 9:00 p.m.**

* Masaje relajante (60 min): desde S/ 120  
* Facial premium: S/ 95  
* Hidroterapia: S/ 80  

¿Desea combinarlo con una estadía? ${signOff}`;
  }

  if (/restaurante|desayuno|comida|cena|gastronom/i.test(lower)) {
    return `El **restaurante gourmet** ofrece fusión peruana e internacional.

* Desayuno buffet: **7:00 – 10:30** (consulte si está incluido en su tarifa)  
* Almuerzo y cena: carta  

¿Reservo mesa o habitación para su visita?`;
  }

  if (/reserv|booking|hosped/i.test(lower)) {
    return `Con gusto le ayudo a reservar. Necesito:

1. **Nombre completo**  
2. **Tipo o número de habitación**  
3. **Check-in y check-out** (ej. 15/06/2026 al 17/06/2026)  
4. **Número de huéspedes**

Política: **10% de adelanto** con Stripe para confirmar. ¿Me comparte esos datos?`;
  }

  if (/check-in|check-out|checkin|checkout|pol[ií]tica|cancel/i.test(lower)) {
    return `Nuestras políticas:

* **Check-in:** 15:00 · **Check-out:** 12:00  
* Cancelación con **48 h** de anticipación  
* Reserva: adelanto **10%** (Stripe), saldo en el hotel  

${signOff}`;
  }

  const knowledgeHint =
    knowledge.length > 0
      ? `\n\nTambién tengo registrado: ${knowledge[0].content.slice(0, 120)}…`
      : "";

  const bookingCtx = buildBookingContext(message, history);
  if (bookingCtx.inBookingFlow) {
    return renderBookingProgressPrompt(bookingCtx);
  }

  return `Gracias por escribirme. Puedo ayudarle con:

* **Precios** por tipo de habitación  
* **Disponibilidad** (por fecha, piso, precio, tipo o capacidad)  
* **Reservas**, ubicación, spa y restaurante  

Pruebe: *"¿disponibles para mañana?"*, *"habitaciones piso 2 para 4 personas"* o *"dime las Estándar de S/ 80"*.${knowledgeHint}

📞 ${config.phone}`;
}
