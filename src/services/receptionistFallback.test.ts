import { describe, it, expect } from "vitest";
import { generateFallbackReply } from "../../lib/receptionist-fallback.js";
import {
  parseRoomQuery,
  queryRooms,
  answerRoomQuery,
  isRoomInventoryQuery,
} from "../../lib/receptionist-rooms.js";

const snapshot = {
  config: {
    name: "Lumina Hotel & Spa",
    address: "Av. Lujo 123",
    phone: "+51 1 234 5678",
    email: "a@b.com",
    whatsapp: "51999999999",
  },
  rooms: [
    { id: "1", number: "101", floor: "1", name: "Habitación Estándar", type: "Estándar", description: "", price: 80, capacity: 2, status: "Disponible", amenities: [] },
    { id: "2", number: "102", floor: "1", name: "Habitación Estándar 102", type: "Estándar", description: "", price: 80, capacity: 2, status: "Disponible", amenities: [] },
    { id: "3", number: "201", floor: "2", name: "Suite Ejecutiva", type: "Suite", description: "", price: 200, capacity: 2, status: "Disponible", amenities: [] },
    { id: "4", number: "301", floor: "3", name: "Suite Premium Lumina", type: "Suite Premium", description: "", price: 450, capacity: 4, status: "Disponible", amenities: [] },
  ],
  reservations: [
    {
      id: "r1",
      roomId: "1",
      roomName: "Habitación Estándar",
      checkIn: "2099-01-02",
      checkOut: "2099-01-03",
      status: "confirmed",
      guests: 2,
    },
  ],
  reviews: [],
  gallery: [],
};

describe("receptionist-rooms", () => {
  it("detecta consultas de inventario", () => {
    expect(isRoomInventoryQuery("habitaciones piso 2")).toBe(true);
    expect(isRoomInventoryQuery("¿dónde están?")).toBe(false);
  });

  it("filtra por piso", () => {
    const query = parseRoomQuery("habitaciones piso 2", []);
    const rooms = queryRooms(snapshot, { ...query, availableOnly: false });
    expect(rooms.every((r) => r.floor === "2")).toBe(true);
    expect(rooms.map((r) => r.number)).toEqual(["201"]);
  });

  it("filtra por capacidad mínima", () => {
    const query = parseRoomQuery("habitaciones para 4 personas", []);
    const rooms = queryRooms(snapshot, { ...query, availableOnly: false });
    expect(rooms.every((r) => r.capacity >= 4)).toBe(true);
    expect(rooms[0].number).toBe("301");
  });

  it("filtra por precio exacto", () => {
    const query = parseRoomQuery("las de 80", []);
    const rooms = queryRooms(snapshot, { ...query, availableOnly: false });
    expect(rooms.every((r) => r.price === 80)).toBe(true);
  });

  it("excluye habitaciones ocupadas cuando pide disponibles", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkIn = tomorrow.toISOString().slice(0, 10);
    const checkOut = new Date(tomorrow.getTime() + 86400000).toISOString().slice(0, 10);

    const blockedSnapshot = {
      ...snapshot,
      reservations: [
        {
          id: "r1",
          roomId: "2",
          roomName: "102",
          checkIn,
          checkOut,
          status: "confirmed",
          guests: 2,
        },
      ],
    };

    const answer = answerRoomQuery("¿disponibles para mañana?", blockedSnapshot, []);
    expect(answer).toMatch(/libres|disponib/i);
    expect(answer).not.toMatch(/102/);
  });
});

describe("receptionist-fallback follow-ups", () => {
  it("lista habitaciones Estándar tras consulta de disponibilidad", () => {
    const history = [
      { role: "user" as const, content: "¿Qué habitaciones tienen disponibles para mañana?" },
      { role: "assistant" as const, content: "Para mañana tenemos 3 habitaciones libres..." },
    ];
    const answer = generateFallbackReply("dime las estandar", snapshot, [], history);
    expect(answer).toMatch(/Estándar|estandar/i);
    expect(answer).toMatch(/Hab\. 101|101/);
    expect(answer).not.toMatch(/Gracias por su consulta\. Soy \*\*Valentina\*\*/);
  });

  it("filtra habitaciones por precio 80", () => {
    const answer = generateFallbackReply("las de 80", snapshot, [], []);
    expect(answer).toMatch(/S\/ 80|80/);
    expect(answer).toMatch(/101/);
  });

  it("lista habitaciones por piso y capacidad", () => {
    const answer = generateFallbackReply("habitaciones piso 3 para 4 personas", snapshot, [], []);
    expect(answer).toMatch(/301/);
    expect(answer).toMatch(/Piso 3|piso 3/i);
    expect(answer).toMatch(/4 pers/);
  });
});
