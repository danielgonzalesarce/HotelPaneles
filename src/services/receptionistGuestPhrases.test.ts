import { describe, it, expect } from "vitest";
import {
  simulateReceptionistReply,
  runConversation,
  assertNoGenericFallback,
} from "../../lib/receptionist-simulate.js";

const snapshot = {
  config: {
    name: "Lumina Hotel & Spa",
    address: "Av. Lujo 123, San Isidro, Lima, Perú",
    phone: "+51 1 234 5678",
    email: "contacto@luminahotel.com",
    whatsapp: "51936068781",
  },
  rooms: [
    {
      id: "1",
      number: "101",
      floor: "1",
      name: "Estándar",
      type: "Estándar",
      description: "",
      price: 80,
      capacity: 2,
      status: "Disponible",
      amenities: ["WiFi"],
    },
    {
      id: "2",
      number: "102",
      floor: "1",
      name: "Doble",
      type: "Doble",
      description: "",
      price: 120,
      capacity: 4,
      status: "Disponible",
      amenities: ["WiFi"],
    },
    {
      id: "3",
      number: "117",
      floor: "1",
      name: "Estándar 117",
      type: "Estándar",
      description: "",
      price: 80,
      capacity: 2,
      status: "Disponible",
      amenities: ["WiFi", "Aire Acondicionado"],
    },
  ],
  reservations: [],
  reviews: [],
  gallery: [],
};

/** Frases reales que un huésped escribiría — ninguna debe caer en respuesta genérica. */
const guestPhrases: Array<{ msg: string; expect: RegExp }> = [
  { msg: "buenas noches", expect: /Valentina|recepción/i },
  { msg: "a qué hora es el desayuno?", expect: /7:00|desayuno|10:30/i },
  { msg: "tienen estacionamiento?", expect: /estacionamiento|parking/i },
  { msg: "las de 80 soles", expect: /80|101|117/i },
  { msg: "solo dobles", expect: /Doble|120/i },
  { msg: "y qué otras habitaciones hay?", expect: /Estándar|Doble|Suite|disponib/i },
  { msg: "me quedo 2 noches desde el viernes", expect: /viernes|2026/i },
  { msg: "Daniel Alexander, 15/06/2026 al 17/06/2026, somos 2", expect: /Daniel|15|17|personas/i },
];

describe("frases sueltas de huésped real", () => {
  guestPhrases.forEach(({ msg, expect: pattern }) => {
    it(`responde bien a: "${msg.slice(0, 40)}…"`, () => {
      const reply = simulateReceptionistReply(msg, snapshot);
      assertNoGenericFallback(reply);
      expect(reply).toMatch(pattern);
    });
  });
});

describe("conversaciones largas tipo persona", () => {
  it("turista: info → disponibilidad → listado → reserva", () => {
    const replies: string[] = [];
    runConversation(
      [
        "hola, primero una consulta",
        "tienen wifi?",
        "ok y para mañana qué hay libre?",
        "dime las estándar",
        "me interesa reservar la 117",
        "soy Carlos Mendoza",
        "2",
        "sí, confirmo",
      ],
      snapshot,
      (_u, r) => {
        assertNoGenericFallback(r);
        replies.push(r);
      }
    );
    expect(replies[1]).toMatch(/WiFi/i);
    expect(replies[3]).toMatch(/117|101/i);
    expect(replies[7]).toMatch(/RESERVA_LISTA|117|confirm/i);
  });

  it("huésped cambia fecha en mitad de reserva", () => {
    const replies: string[] = [];
    runConversation(
      [
        "reserva para el miércoles",
        "Ana Torres",
        "2",
        "Estándar",
        "mejor para el sábado",
        "117",
        "sí, confirmo",
      ],
      snapshot,
      (_u, r) => {
        assertNoGenericFallback(r);
        replies.push(r);
      }
    );
    expect(replies[4]).toMatch(/s[aá]bado/i);
    expect(replies[6]).toMatch(/RESERVA_LISTA|117/i);
  });
});
