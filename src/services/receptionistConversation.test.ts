import { describe, it, expect } from "vitest";
import { generateFallbackReply } from "../../lib/receptionist-fallback.js";
import { parseStayDates } from "../../lib/receptionist-dates.js";
import { parseBareName } from "../../lib/receptionist-conversation.js";

const snapshot = {
  config: {
    name: "Lumina Hotel & Spa",
    address: "Av",
    phone: "+51 123",
    email: "a@b.com",
    whatsapp: "51",
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
  ],
  reservations: [],
  reviews: [],
  gallery: [],
};

describe("receptionist conversation flow", () => {
  it("detecta miércoles en lenguaje natural", () => {
    const d = parseStayDates("reserva para el miércoles");
    expect(d.checkIn).toBeTruthy();
    expect(d.checkOut).toBeTruthy();
  });

  it("continúa reserva tras dar solo el nombre", () => {
    const history = [
      { role: "user" as const, content: "deseo hacer una reserva para el miercoles" },
      { role: "assistant" as const, content: "¿Me indica su nombre?" },
    ];
    const answer = generateFallbackReply("Daniel Alexander", snapshot, [], history);
    expect(answer).toMatch(/Daniel Alexander/);
    expect(answer).toMatch(/personas/i);
    expect(answer).not.toMatch(/Gracias por escribirme/);
  });

  it("resume disponibilidad por tipo para el miércoles", () => {
    const answer = generateFallbackReply(
      "que habitaciones tienes disponible para el miercoles",
      snapshot
    );
    expect(answer).toMatch(/Estándar/i);
    expect(answer).toMatch(/Doble/i);
    expect(answer).not.toMatch(/Hab\. 203/);
  });

  it("parsea nombre suelto", () => {
    expect(parseBareName("Daniel Alexander")).toBe("Daniel Alexander");
  });

  it("responde disponibilidad para otro día de la semana", () => {
    const answer = generateFallbackReply("quiero para el viernes", snapshot, [], [
      {
        role: "assistant",
        content: "46 habitaciones libres de 49 totales. Estándar: 14 disponible(s)",
      },
    ]);
    expect(answer).toMatch(/viernes|2026/i);
    expect(answer).toMatch(/Estándar/i);
    expect(answer).not.toMatch(/Gracias por escribirme/);
  });

  it("da indicaciones de llegada sin repetir solo contacto", () => {
    const answer = generateFallbackReply("Necesito indicaciones para llegar", snapshot);
    expect(answer).toMatch(/c[oó]mo llegar|Aeropuerto|Javier Prado/i);
    expect(answer).not.toMatch(/¿Necesita indicaciones para llegar\?/);
  });

  it("continúa reserva con un solo nombre", () => {
    const history = [
      { role: "user" as const, content: "disponibles para el viernes" },
      { role: "assistant" as const, content: "46 habitaciones libres…" },
      { role: "user" as const, content: "estandar" },
      {
        role: "assistant" as const,
        content: "Perfecto, retomamos del 2026-06-12 al 2026-06-13 · tipo Estándar. ¿Me indica su nombre completo?",
      },
    ];
    const answer = generateFallbackReply("Daniel", snapshot, [], history);
    expect(answer).toMatch(/Daniel/i);
    expect(answer).toMatch(/personas/i);
    expect(answer).not.toMatch(/Gracias por escribirme/);
  });
});
