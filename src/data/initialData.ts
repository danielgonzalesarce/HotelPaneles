import { Room, RoomType, Review, User, HotelConfig, RoomStatus, GalleryImage, Tenant } from '../types';
import { resolvePlanPermissions } from '../../lib/tenant/planPermissions.js';
import { buildAvatarFromName } from '../utils/userAvatar';

/** URL Unsplash estable para web (webp/jpeg, HTTPS, sin hotlink bloqueado). */
const UNSPLASH = (photoId: string, width = 1200) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&q=80&w=${width}`;

/** Cuatro fotos por tipo — solo IDs ya usados y verificados en el proyecto. */
const ROOM_IMAGE_SETS: Record<RoomType, [string, string, string, string]> = {
  [RoomType.Standard]: [
    UNSPLASH('1566665797739-1674de7a421a'),
    UNSPLASH('1590490360182-c33d57733427'),
    UNSPLASH('1590490360170-07f7c46ef52c'),
    UNSPLASH('1631049307264-da0ec9d70304'),
  ],
  [RoomType.Double]: [
    UNSPLASH('1595576508898-0ad5c879a061'),
    UNSPLASH('1591088398332-8a7791972843'),
    UNSPLASH('1566665797739-1674de7a421a'),
    UNSPLASH('1590490360182-c33d57733427'),
  ],
  [RoomType.Suite]: [
    UNSPLASH('1582719478250-c89cae4dc85b'),
    UNSPLASH('1631049307264-da0ec9d70304'),
    UNSPLASH('1590490359683-658d3d23f972'),
    UNSPLASH('1578683010236-d716f9a3f461'),
  ],
  [RoomType.PremiumSuite]: [
    UNSPLASH('1590490359683-658d3d23f972'),
    UNSPLASH('1578683010236-d716f9a3f461'),
    UNSPLASH('1590490360170-07f7c46ef52c'),
    UNSPLASH('1582719478250-c89cae4dc85b'),
  ],
};

export function imagesForRoomType(type: RoomType): string[] {
  return [...ROOM_IMAGE_SETS[type]];
}

export const INITIAL_ROOMS: Room[] = [
  {
    id: '1',
    number: '101',
    floor: '1',
    name: 'Habitación Estándar',
    type: RoomType.Standard,
    description: 'Una acogedora habitación perfecta para viajeros individuales o parejas. Equipada con todas las comodidades esenciales para una estancia confortable.',
    price: 80,
    capacity: 2,
    images: imagesForRoomType(RoomType.Standard),
    amenities: ['WiFi', 'Aire Acondicionado', 'TV Cable', 'Caja Fuerte'],
    featured: true,
    status: RoomStatus.Available
  },
  {
    id: '2',
    number: '102',
    floor: '1',
    name: 'Habitación Doble',
    type: RoomType.Double,
    description: 'Espaciosa habitación con dos camas matrimoniales, ideal para familias pequeñas o amigos que viajan juntos.',
    price: 120,
    capacity: 4,
    images: imagesForRoomType(RoomType.Double),
    amenities: ['WiFi', 'Aire Acondicionado', 'Minibar', 'Escritorio'],
    featured: true,
    status: RoomStatus.Available
  },
  {
    id: '3',
    number: '201',
    floor: '2',
    name: 'Suite Ejecutiva',
    type: RoomType.Suite,
    description: 'Elegancia y confort superior. Cuenta con sala de estar independiente y vistas panorámicas a la ciudad.',
    price: 200,
    capacity: 2,
    images: imagesForRoomType(RoomType.Suite),
    amenities: ['WiFi', 'Jacuzzi', 'Minibar', 'Cafetera Nespresso', 'Bata de Baño'],
    featured: true,
    status: RoomStatus.Available
  },
  {
    id: '4',
    number: '301',
    floor: '3',
    name: 'Suite Premium Lumina',
    type: RoomType.PremiumSuite,
    description: 'La máxima expresión del lujo. Dos dormitorios, cocina equipada, terraza privada y servicio de mayordomo.',
    price: 450,
    capacity: 6,
    images: imagesForRoomType(RoomType.PremiumSuite),
    amenities: ['WiFi', 'Piscina Privada', 'Cocina', 'Mayordomo 24h', 'Traslado Aeropuerto'],
    featured: true,
    status: RoomStatus.Available
  },
  // Generar 45 habitaciones adicionales
  ...Array.from({ length: 45 }, (_, i) => {
    const id = (i + 5).toString();
    const floor = Math.floor(i / 15) + 1;
    const roomNum = (floor * 100 + (i % 15) + 3).toString();
    
    let type = RoomType.Standard;
    let name = 'Habitación Estándar';
    let price = 80;
    let capacity = 2;
    let amenities = ['WiFi', 'Aire Acondicionado', 'TV Cable'];
    let images = imagesForRoomType(RoomType.Standard);

    if (i >= 15 && i < 30) {
      type = RoomType.Double;
      name = 'Habitación Doble';
      price = 120;
      capacity = 4;
      amenities = ['WiFi', 'Aire Acondicionado', 'Minibar'];
      images = imagesForRoomType(RoomType.Double);
    } else if (i >= 30 && i < 40) {
      type = RoomType.Suite;
      name = 'Suite Ejecutiva';
      price = 200;
      capacity = 2;
      amenities = ['WiFi', 'Jacuzzi', 'Minibar'];
      images = imagesForRoomType(RoomType.Suite);
    } else if (i >= 40) {
      type = RoomType.PremiumSuite;
      name = 'Suite Premium';
      price = 450;
      capacity = 6;
      amenities = ['WiFi', 'Piscina Privada', 'Cocina'];
      images = imagesForRoomType(RoomType.PremiumSuite);
    }

    return {
      id,
      number: roomNum,
      floor: floor.toString(),
      name: `${name} ${roomNum}`,
      type,
      description: `Una excelente opción de ${name.toLowerCase()} en el piso ${floor}.`,
      price,
      capacity,
      images,
      amenities,
      featured: false,
      status: RoomStatus.Available
    };
  })
];

const REVIEWER_NAMES = [
  'María Fernández', 'Pedro Salinas', 'Camila Rojas', 'Diego Morales', 'Valentina Cruz',
  'Ricardo Luna', 'Andrea Paredes', 'Luis Vargas', 'Gabriela Ortiz', 'Héctor Mendoza',
  'Isabel Torres', 'Oscar Rivas', 'Natalia Peña', 'Felipe Castro', 'Renata Silva',
  'Tomás Aguilar', 'Daniela Ríos', 'Emilio Navarro', 'Paula Herrera', 'Sergio Delgado',
  'Claudia Vargas', 'Arturo León', 'Verónica Soto', 'Mauricio Gil', 'Laura Benítez',
  'Jorge Acosta', 'Silvia Romero', 'Alberto Mora', 'Carmen Duarte', 'Raúl Pacheco',
];

const ROOM_COMMENT_TEMPLATES: Record<RoomType, string[]> = {
  [RoomType.Standard]: [
    'La habitación {num} superó mis expectativas: limpia, silenciosa y muy cómoda.',
    'Excelente descanso en la {num}. La cama es de primera y el aire acondicionado funciona perfecto.',
    'Muy buena relación calidad-precio en la {num}. Todo impecable y bien cuidado.',
    'La {num} tiene todo lo necesario para una estancia perfecta. Volvería sin dudarlo.',
  ],
  [RoomType.Double]: [
    'La {num} es ideal para familias: amplia, cómoda y con excelente minibar.',
    'Habitación doble {num} impecable. Las camas son muy confortables para cuatro personas.',
    'Nos encantó la {num}, espacio de sobra y ambiente muy agradable.',
    'La {num} cumplió al 100%: limpieza diaria excelente y buena ventilación.',
  ],
  [RoomType.Suite]: [
    'La suite {num} es espectacular. El jacuzzi y la vista hacen la diferencia.',
    'Estancia de lujo en la {num}. Sala de estar separada muy útil para trabajar.',
    'La {num} ofrece un confort superior. Detalles de diseño realmente premium.',
    'Experiencia memorable en la suite {num}. Servicio impecable y ambiente relajante.',
  ],
  [RoomType.PremiumSuite]: [
    'La suite premium {num} es otro nivel. Terraza y amenities de primera clase.',
    'La {num} superó todas nuestras expectativas. Espacio, lujo y privacidad total.',
    'Estancia perfecta en la {num}. El servicio de mayordomo marcó la diferencia.',
    'La {num} vale cada sol: cocina equipada, vistas increíbles y máximo confort.',
  ],
};

function reviewerForRoom(roomId: string, index: number): string {
  const seed = parseInt(roomId, 10) * 7 + index;
  return REVIEWER_NAMES[seed % REVIEWER_NAMES.length];
}

function reviewDateForRoom(roomId: string, index: number): string {
  const month = ((parseInt(roomId, 10) + index) % 12) + 1;
  const day = ((parseInt(roomId, 10) * 3 + index * 5) % 26) + 1;
  return `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function ratingForIndex(index: number): number {
  return index === 2 ? 4 : 5;
}

export function reviewsPerRoom(roomId: string): number {
  const n = parseInt(roomId, 10);
  if (Number.isNaN(n)) return 4;
  return 3 + (n % 2);
}

/** Una reseña de habitación (4–5★) con id estable room-{roomId}-{index}. */
export function createRoomReviewEntry(room: Room, index: number): Review {
  const userName = reviewerForRoom(room.id, index);
  const templates = ROOM_COMMENT_TEMPLATES[room.type];
  const comment = templates[index % templates.length]
    .replace(/\{num\}/g, room.number)
    .replace(/\{name\}/g, room.name);

  return {
    id: `room-${room.id}-${index}`,
    userId: `guest-${room.id}-${index}`,
    userName,
    userAvatarUrl: buildAvatarFromName(userName),
    roomId: room.id,
    roomNumber: room.number,
    roomName: room.name,
    rating: ratingForIndex(index),
    comment,
    date: reviewDateForRoom(room.id, index),
    approved: true,
  };
}

/** 3 o 4 reseñas aprobadas (4–5★) por cada habitación del inventario. */
function buildRoomReviews(rooms: Room[]): Review[] {
  const reviews: Review[] = [];

  for (const room of rooms) {
    const count = reviewsPerRoom(room.id);
    for (let i = 0; i < count; i++) {
      reviews.push(createRoomReviewEntry(room, i));
    }
  }

  return reviews;
}

/** Reseñas generales del hotel (sin habitación asociada). */
export const INITIAL_GENERAL_REVIEWS: Review[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Carlos Rodríguez',
    userAvatarUrl: buildAvatarFromName('Carlos Rodríguez'),
    rating: 5,
    comment: 'Una experiencia increíble. El servicio es impecable y las habitaciones son hermosas.',
    date: '2024-03-01',
    approved: true
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'Ana Martínez',
    userAvatarUrl: buildAvatarFromName('Ana Martínez'),
    rating: 4,
    comment: 'Muy buena ubicación y excelente desayuno. Volvería sin duda.',
    date: '2024-02-25',
    approved: true
  },
  {
    id: '3',
    userId: 'u3',
    userName: 'Roberto Sánchez',
    userAvatarUrl: buildAvatarFromName('Roberto Sánchez'),
    rating: 5,
    comment: 'El spa es de otro nivel. Me sentí totalmente renovado después de mi estancia.',
    date: '2024-03-05',
    approved: true
  },
  {
    id: '5',
    userId: 'u5',
    userName: 'Miguel Ángel Torres',
    userAvatarUrl: buildAvatarFromName('Miguel Ángel Torres'),
    rating: 5,
    comment: 'Excelente atención del personal. Siempre dispuestos a ayudar con una sonrisa.',
    date: '2024-03-10',
    approved: true
  },
  {
    id: '6',
    userId: 'u6',
    userName: 'Sofía Valdivia',
    userAvatarUrl: buildAvatarFromName('Sofía Valdivia'),
    rating: 4,
    comment: 'Habitaciones muy limpias y modernas. El restaurante tiene platos deliciosos.',
    date: '2024-03-12',
    approved: true
  },
  {
    id: '7',
    userId: 'u7',
    userName: 'Javier Herrera',
    userAvatarUrl: buildAvatarFromName('Javier Herrera'),
    rating: 5,
    comment: 'Ideal para viajes de negocios. El WiFi es rápido y el ambiente es muy tranquilo.',
    date: '2024-03-15',
    approved: true
  },
  {
    id: '8',
    userId: 'u8',
    userName: 'Lucía Méndez',
    userAvatarUrl: buildAvatarFromName('Lucía Méndez'),
    rating: 5,
    comment: 'Me encantó la decoración y el aroma del hotel. Cada detalle está muy bien cuidado.',
    date: '2024-03-18',
    approved: true
  },
  {
    id: '9',
    userId: 'u9',
    userName: 'Fernando Castro',
    userAvatarUrl: buildAvatarFromName('Fernando Castro'),
    rating: 5,
    comment: 'El mejor hotel en el que me he hospedado en Lima. Lujo y confort garantizados.',
    date: '2024-03-20',
    approved: true
  },
  {
    id: '10',
    userId: 'u10',
    userName: 'Patricia Loli',
    userAvatarUrl: buildAvatarFromName('Patricia Loli'),
    rating: 4,
    comment: 'Una estancia muy placentera. La piscina climatizada es fantástica.',
    date: '2024-03-22',
    approved: true
  },
];

export const INITIAL_REVIEWS: Review[] = [
  ...INITIAL_GENERAL_REVIEWS,
  ...buildRoomReviews(INITIAL_ROOMS),
];

export const INITIAL_USERS: User[] = [
  {
    id: 'superadmin',
    name: 'Super Admin',
    email: 'superadmin@empresa.com',
    phone: '999888777',
    avatarUrl: buildAvatarFromName('Super Admin'),
    role: 'super_admin',
    password: 'super'
  },
  {
    id: 'admin',
    name: 'Administrador',
    email: 'admin@hotel.com',
    phone: '999999999',
    avatarUrl: buildAvatarFromName('Administrador'),
    role: 'admin',
    password: 'admin',
    tenantId: '1',
  },
  {
    id: 'user',
    name: 'Juan Pérez',
    email: 'juan@gmail.com',
    phone: '987654321',
    avatarUrl: buildAvatarFromName('Juan Pérez'),
    role: 'user',
    password: 'user'
  }
];

export const INITIAL_CONFIG: HotelConfig = {
  name: 'Lumina Hotel & Spa',
  address: 'Av. Lujo 123, San Isidro, Lima, Perú',
  phone: '+51 1 234 5678',
  email: 'contacto@luminahotel.com',
  whatsapp: '51936068781',
  fiscal: {
    ruc: '20123456789',
    razonSocial: 'Lumina Hotel & Spa S.A.C.',
    nombreComercial: 'Lumina Hotel & Spa',
    domicilioFiscal: 'Av. Lujo 123, San Isidro, Lima, Perú',
    esEmisorElectronico: true,
    boletaSeries: 'B001',
    facturaSeries: 'F001',
  },
};

export const INITIAL_GALLERY: GalleryImage[] = [
  { id: '1', url: 'https://images.unsplash.com/photo-1564013799912-ab6d00164c91?auto=format&fit=crop&q=80&w=800', title: 'Fachada Principal' },
  { id: '2', url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=800', title: 'Piscina Infinity' },
  { id: '3', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=800', title: 'Lobby de Lujo' },
  { id: '4', url: 'https://images.unsplash.com/photo-1540555700478-4bbe28948cef?auto=format&fit=crop&q=80&w=800', title: 'Spa & Relax' },
  { id: '5', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800', title: 'Restaurante Gourmet' },
  { id: '6', url: 'https://images.unsplash.com/photo-1590490360170-07f7c46ef52c?auto=format&fit=crop&q=80&w=800', title: 'Suite Panorámica' },
];

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: '1',
    name: 'Lumina Hotel & Spa',
    contactName: 'Juan Pérez',
    email: 'admin@hotel.com',
    phone: '999888777',
    ruc: '20123456789',
    razonSocial: 'Lumina Hotel & Spa S.A.C.',
    rucStatus: 'activo',
    plan: 'Pro',
    permissions: resolvePlanPermissions('Pro'),
    status: 'Activo',
    createdAt: new Date().toISOString(),
    nextBillingDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    monthlyFee: 199.99,
    theme: {
      primaryColor: '#0f172a',
      coverUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=2000',
    },
  },
];
