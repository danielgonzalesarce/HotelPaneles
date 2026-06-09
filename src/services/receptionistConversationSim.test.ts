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
  },
  rooms: [
    {
      id: "1",
      number: "101",
      floor: "1",
      name: "Habitación Estándar",
      type: "Estándar",
      description: "",
      price: 80,
      capacity: 2,
      status: "Disponible",
      amenities: ["WiFi", "Aire Acondicionado"],
    },
    {
      id: "2",
      number: "102",
      floor: "1",
      name: "Habitación Estándar 102",
      type: "Estándar",
      description: "",
      price: 80,
      capacity: 2,
      status: "Reservada",
      amenities: ["WiFi"],
    },
    {
      id: "3",
      number: "103",
      floor: "1",
      name: "Habitación Estándar 103",
      type: "Estándar",
      description: "",
      price: 80,
      capacity: 2,
      status: "Disponible",
      amenities: ["WiFi"],
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
  ],
  reservations: [],
  reviews: [],
  gallery: [],
};

describe("conversación fluida con Valentina", () => {
  it("contacto → indicaciones para llegar", () => {
    const history = runConversation(
      ["Necesito el teléfono y WhatsApp de recepción", "Necesito indicaciones para llegar"],
      snapshot,
      (_user, reply) => assertNoGenericFallback(reply)
    );

    expect(history[1].content).toMatch(/WhatsApp|51936068781/i);
    expect(history[3].content).toMatch(/Aeropuerto|Javier Prado|c[oó]mo llegar/i);
    expect(history[3].content).not.toMatch(/¿Necesita indicaciones para llegar\?/);
  });

  it("disponibilidad mañana → viernes → listado Estándar", () => {
    const replies: string[] = [];
    runConversation(
      [
        "¿Qué habitaciones tienen disponibles para mañana?",
        "quiero para el viernes",
        "dime las estandar",
      ],
      snapshot,
      (_user, reply) => {
        assertNoGenericFallback(reply);
        replies.push(reply);
      }
    );

    expect(replies[0]).toMatch(/libres|disponible/i);
    expect(replies[1]).toMatch(/viernes|2026/i);
    expect(replies[2]).toMatch(/101|103/);
    expect(replies[2]).not.toMatch(/nombre completo/i);
    expect(replies[2]).not.toMatch(/Hab\. 102|102.*libre/i);
  });

  it("disponibilidad → reserva Estándar con nombre, huéspedes y número", () => {
    const replies: string[] = [];
    runConversation(
      [
        "disponibles para el viernes",
        "estandar",
        "Daniel",
        "2",
        "103",
        "sí, confirmo",
      ],
      snapshot,
      (_user, reply) => {
        assertNoGenericFallback(reply);
        replies.push(reply);
      }
    );

    expect(replies[1]).toMatch(/nombre completo/i);
    expect(replies[2]).toMatch(/Daniel/i);
    expect(replies[2]).toMatch(/personas/i);
    expect(replies[3]).toMatch(/n[uú]mero de habitaci|103/i);
    expect(replies[4]).toMatch(/Hab\. 103|103/);
    expect(replies[4]).toMatch(/confirmo/i);

    const { intent } = stripBookingBlock(replies[5]);
    expect(intent?.guestName).toBe("Daniel");
    expect(intent?.guests).toBe(2);
    expect(intent?.roomNumber).toBe("103");
  });

  it("habitación reservada → alternativas sin decir que está libre", () => {
    const history: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: "disponibles para el viernes" },
      { role: "assistant", content: "46 habitaciones libres…" },
      { role: "user", content: "estandar" },
      { role: "assistant", content: "¿Me indica su nombre completo?" },
      { role: "user", content: "Daniel" },
      { role: "assistant", content: "¿cuántas personas serán?" },
      { role: "user", content: "2" },
      { role: "assistant", content: "¿Qué número de habitación desea?" },
    ];

    const reply = simulateReceptionistReply("102", snapshot, history);
    assertNoGenericFallback(reply);
    expect(reply).toMatch(/no est[aá] disponible|reservada/i);
    expect(reply).toMatch(/103/);
    expect(reply).not.toMatch(/102.*libre/i);
  });

  it("reserva explícita desde cero", () => {
    const replies: string[] = [];
    runConversation(
      [
        "deseo hacer una reservación para el jueves",
        "Daniel Alexander Arce",
        "2",
        "Estándar",
        "103",
        "sí, confirmo",
      ],
      snapshot,
      (_user, reply) => {
        assertNoGenericFallback(reply);
        replies.push(reply);
      }
    );

    expect(replies[0]).toMatch(/nombre/i);
    expect(replies[2]).toMatch(/n[uú]mero de habitaci|103|Estándar/i);
    expect(stripBookingBlock(replies[5]).intent?.guestName).toBe("Daniel Alexander Arce");
  });

  it("pregunta de precios sin caer en genérico", () => {
    const reply = simulateReceptionistReply("cuánto cuesta una noche", snapshot);
    expect(reply).toMatch(/Estándar|S\/ 80/i);
    assertNoGenericFallback(reply);
  });
});
