export interface HotelSnapshot {
  config: {
    name: string;
    address: string;
    phone: string;
    email: string;
    whatsapp: string;
    description?: string;
  };
  rooms: Array<{
    id: string;
    number: string;
    floor: string;
    name: string;
    type: string;
    description: string;
    price: number;
    capacity: number;
    status: string;
    amenities: string[];
  }>;
  reservations: Array<{
    id: string;
    roomId: string;
    roomName: string;
    checkIn: string;
    checkOut: string;
    status: string;
    guests: number;
  }>;
  reviews: Array<{
    userName: string;
    rating: number;
    comment: string;
  }>;
  gallery: Array<{ title: string }>;
}

export interface KnowledgeEntry {
  topic: string;
  content: string;
  source?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BookingIntent {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  roomType: string;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface ReceptionistChatResult {
  text: string;
  sessionId: string;
  booking?: {
    reservationId: string;
    checkoutUrl: string;
    roomName: string;
    deposit: number;
    totalPrice: number;
    reservation: Record<string, unknown>;
  };
  newKnowledge?: KnowledgeEntry[];
}
