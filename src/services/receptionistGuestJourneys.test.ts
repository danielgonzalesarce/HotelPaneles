import { describe, it, expect } from "vitest";
import {
  simulateReceptionistReply,
  runConversation,
  assertNoGenericFallback,
} from "../../lib/receptionist-simulate.js";
import { stripBookingBlock } from "../../lib/receptionist-booking.js";

const snapshot = {
  config: {
    name: "Lumina Hotel & Spa",
    address: "Av. Lujo 123, San Isidro, Lima, Perú",
    phone: "+51 1 234 5678",
    email: "contacto@luminahotel.com",
    whatsapp: "51936068781",
    description: "Hotel boutique cinco estrellas en San Isidro.",
  },
  rooms: [
    {
      id: "1",
      number: "101",
      floor: "1",
      name: "Habitación Estándar",
      type: "Estándar",
      description: "Acogedora para parejas.",
      price: 80,
      capacity: 2,
      status: "Disponible",
      amenities: ["WiFi", "Aire Acondicionado", "TV Cable"],
    },
    {
      id: "2",
      number: "102",
      floor: "1",
      name: "Habitación Doble",
      type: "Doble",
      description: "Dos camas.",
      price: 120,
      capacity: 4,
      status: "Disponible",
      amenities: ["WiFi", "Minibar"],
    },
    {
      id: "3",
      number: "117",
      floor: "1",
      name: "Habitación Estándar 117",
      type: "Estándar",
      description: "",
      price: 80,
      capacity: 2,
      status: "Disponible",
      amenities: ["WiFi", "Aire Acondicionado", "TV Cable"],
    },
    {
      id: "4",
      number: "201",
      floor: "2",
      name: "Suite Ejecutiva",
      type: "Suite",
      description: "",
      price: 200,
      capacity: 2,
      status: "Disponible",
      amenities: ["WiFi", "Jacuzzi"],
    },
    {
      id: "5",
      number: "301",
      floor: "3",
      name: "Suite Premium Lumina",
      type: "Suite Premium",
      description: "",
      price: 450,
      capacity: 6,
      status: "Disponible",
      amenities: ["WiFi", "Piscina Privada"],
    },
  ],
  reservations: [],
  reviews: [{ userName: "María", rating: 5, comment: "Excelente spa y atención." }],
  gallery: [],
};

function guestTurn(
  message: string,
  history: { role: "user" | "assistant"; content: string }[] = []
) {
  const reply = simulateReceptionistReply(message, snapshot, history);
  assertNoGenericFallback(reply);
  return reply;
}

describe("huésped curioso — información del hotel", () => {
  it("explora spa, restaurante y políticas", () => {
    expect(guestTurn("hola")).toMatch(/Valentina|recepción/i);
    expect(guestTurn("¿tienen spa?")).toMatch(/Spa|masaje|8:00/i);
    expect(guestTurn("y el restaurante?")).toMatch(/restaurante|desayuno|carta/i);
    expect(guestTurn("política de cancelación")).toMatch(/48|cancel/i);
    expect(guestTurn("check-in y check-out")).toMatch(/15:00|12:00/i);
  });

  it("pregunta qué incluye una habitación concreta", () => {
    const reply = guestTurn("¿qué incluye la habitación 117?");
    expect(reply).toMatch(/117/i);
    expect(reply).toMatch(/WiFi|Aire/i);
    expect(reply).not.toMatch(/caja fuerte/i);
  });

  it("cómo llegar desde el aeropuerto", () => {
    const reply = guestTurn("voy desde el aeropuerto, cómo llego?");
    expect(reply).toMatch(/Aeropuerto|Javier Prado|taxi/i);
  });

  it("habitaciones para 4 personas en piso 2", () => {
    const reply = guestTurn("habitaciones piso 2 para 4 personas");
    expect(reply).not.toMatch(/Gracias por escribirme/);
  });
});

describe("huésped indeciso — cambia de opinión", () => {
  it("consulta viernes, luego sábado", () => {
    const replies: string[] = [];
    runConversation(
      ["disponibles para el viernes", "y para el sábado?"],
      snapshot,
      (_u, r) => {
        assertNoGenericFallback(r);
        replies.push(r);
      }
    );
    expect(replies[0]).toMatch(/viernes/i);
    expect(replies[1]).toMatch(/s[aá]bado/i);
  });

  it("elige Estándar y luego pide Doble", () => {
    const replies: string[] = [];
    runConversation(
      [
        "disponibles para el viernes",
        "estandar",
        "Daniel",
        "2",
        "mejor doble",
      ],
      snapshot,
      (_u, r) => {
        assertNoGenericFallback(r);
        replies.push(r);
      }
    );
    expect(replies[4]).toMatch(/Doble|120/i);
  });
});

describe("huésped directo — reserva completa", () => {
  it("reserva todo en un mensaje y confirma", () => {
    const replies: string[] = [];
    runConversation(
      [
        "Daniel Alexander, reserva para el jueves al viernes, somos 2",
        "Estándar",
        "117",
        "sí, confirmo",
      ],
      snapshot,
      (_u, r) => {
        assertNoGenericFallback(r);
        replies.push(r);
      }
    );
    expect(replies[0]).toMatch(/Daniel|jueves|personas|opciones|nombre/i);
    const last = replies[replies.length - 1];
    const { intent } = stripBookingBlock(last);
    expect(intent?.roomNumber).toBe("117");
  });

  it("reserva paso a paso como persona real", () => {
    const script = [
      "Buenas noches, quiero reservar para el miércoles",
      "María Fernández",
      "2 personas",
      "standard",
      "117",
      "sí confirmo",
    ];
    const replies: string[] = [];
    runConversation(script, snapshot, (_u, r) => {
      assertNoGenericFallback(r);
      replies.push(r);
    });
    expect(stripBookingBlock(replies[5]).intent?.guestName).toMatch(/María/i);
  });

  it("pregunta presupuesto máximo en reserva", () => {
    const history = [
      { role: "user" as const, content: "disponibles para el viernes" },
      { role: "assistant" as const, content: "resumen disponibilidad…" },
      { role: "user" as const, content: "estandar" },
      { role: "assistant" as const, content: "¿nombre?" },
      { role: "user" as const, content: "Pedro" },
      { role: "assistant" as const, content: "¿personas?" },
      { role: "user" as const, content: "2" },
    ];
    const reply = guestTurn("hasta S/ 120", history);
    expect(reply).toMatch(/Estándar|80|120/i);
  });
});

describe("huésped confundido — frases coloquiales", () => {
  it("solo dice quiero reservar", () => {
    const reply = guestTurn("quiero reservar");
    expect(reply).toMatch(/nombre|fechas|hu[eé]spedes|reserv/i);
  });

  it("pregunta si hay wifi", () => {
    const reply = guestTurn("tienen wifi?");
    expect(reply).toMatch(/WiFi|wifi/i);
  });

  it("sigue tras saludo con disponibilidad", () => {
    const replies: string[] = [];
    runConversation(
      ["hola", "qué tienen libre para mañana?"],
      snapshot,
      (_u, r) => {
        assertNoGenericFallback(r);
        replies.push(r);
      }
    );
    expect(replies[1]).toMatch(/libres|disponib/i);
  });
});
