import { describe, it, expect } from "vitest";
import {
  answerRoomDetailQuery,
  getRoomDisplayAmenities,
} from "../../lib/receptionist-room-detail.js";
import { generateFallbackReply } from "../../lib/receptionist-fallback.js";

const room117 = {
  id: "19",
  number: "117",
  floor: "1",
  name: "Habitación Estándar 117",
  type: "Estándar",
  description: "Una excelente opción de habitación estándar en el piso 1.",
  price: 80,
  capacity: 2,
  status: "Disponible",
  amenities: ["WiFi", "Aire Acondicionado", "TV Cable"],
};

const snapshot = {
  config: {
    name: "Lumina Hotel & Spa",
    address: "Av. Lujo 123",
    phone: "+51 1 234 5678",
    email: "a@b.com",
    whatsapp: "51999999999",
  },
  rooms: [room117],
  reservations: [],
  reviews: [],
  gallery: [],
};

describe("receptionist-room-detail", () => {
  it("lista solo amenidades registradas + las de la ficha web", () => {
    expect(getRoomDisplayAmenities(room117)).toEqual([
      "WiFi",
      "Aire Acondicionado",
      "TV Cable",
      "Servicio al cuarto 24/7",
      "Limpieza diaria",
    ]);
  });

  it("no inventa caja fuerte para la 117", () => {
    const answer = answerRoomDetailQuery("¿qué incluye la habitación 117?", snapshot);
    expect(answer).toMatch(/WiFi/);
    expect(answer).toMatch(/TV Cable/);
    expect(answer).not.toMatch(/Caja Fuerte/i);
    expect(answer).not.toMatch(/secador/i);
  });

  it("recuerda la habitación del historial", () => {
    const history = [
      { role: "user" as const, content: "deseo la habitacion 117" },
      { role: "assistant" as const, content: "Perfecto, la 117..." },
    ];
    const answer = generateFallbackReply("¿qué incluye mi habitación?", snapshot, [], history);
    expect(answer).toMatch(/117/);
    expect(answer).not.toMatch(/Caja Fuerte/i);
  });
});
