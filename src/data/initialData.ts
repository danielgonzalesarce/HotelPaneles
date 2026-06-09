import { Room, RoomType, Review, User, HotelConfig, RoomStatus, GalleryImage, Tenant } from '../types';
import { resolvePlanPermissions } from '../../lib/tenant/planPermissions.js';

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
    images: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=1000'
    ],
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
    images: [
      'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&q=80&w=1000'
    ],
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
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&q=80&w=1000'
    ],
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
    images: [
      'https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80&w=1000'
    ],
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
    let images = ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=1000'];

    if (i >= 15 && i < 30) {
      type = RoomType.Double;
      name = 'Habitación Doble';
      price = 120;
      capacity = 4;
      amenities = ['WiFi', 'Aire Acondicionado', 'Minibar'];
      images = ['https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&q=80&w=1000'];
    } else if (i >= 30 && i < 40) {
      type = RoomType.Suite;
      name = 'Suite Ejecutiva';
      price = 200;
      capacity = 2;
      amenities = ['WiFi', 'Jacuzzi', 'Minibar'];
      images = ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1000'];
    } else if (i >= 40) {
      type = RoomType.PremiumSuite;
      name = 'Suite Premium';
      price = 450;
      capacity = 6;
      amenities = ['WiFi', 'Piscina Privada', 'Cocina'];
      images = ['https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&q=80&w=1000'];
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

export const INITIAL_REVIEWS: Review[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Carlos Rodríguez',
    rating: 5,
    comment: 'Una experiencia increíble. El servicio es impecable y las habitaciones son hermosas.',
    date: '2024-03-01',
    approved: true
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'Ana Martínez',
    rating: 4,
    comment: 'Muy buena ubicación y excelente desayuno. Volvería sin duda.',
    date: '2024-02-25',
    approved: true
  },
  {
    id: '3',
    userId: 'u3',
    userName: 'Roberto Sánchez',
    rating: 5,
    comment: 'El spa es de otro nivel. Me sentí totalmente renovado después de mi estancia.',
    date: '2024-03-05',
    approved: true
  },
  {
    id: '4',
    userId: 'u4',
    userName: 'Elena Gómez',
    rating: 5,
    comment: 'La Suite Premium superó todas mis expectativas. La vista a la ciudad es inmejorable.',
    date: '2024-03-08',
    approved: true
  },
  {
    id: '5',
    userId: 'u5',
    userName: 'Miguel Ángel Torres',
    rating: 5,
    comment: 'Excelente atención del personal. Siempre dispuestos a ayudar con una sonrisa.',
    date: '2024-03-10',
    approved: true
  },
  {
    id: '6',
    userId: 'u6',
    userName: 'Sofía Valdivia',
    rating: 4,
    comment: 'Habitaciones muy limpias y modernas. El restaurante tiene platos deliciosos.',
    date: '2024-03-12',
    approved: true
  },
  {
    id: '7',
    userId: 'u7',
    userName: 'Javier Herrera',
    rating: 5,
    comment: 'Ideal para viajes de negocios. El WiFi es rápido y el ambiente es muy tranquilo.',
    date: '2024-03-15',
    approved: true
  },
  {
    id: '8',
    userId: 'u8',
    userName: 'Lucía Méndez',
    rating: 5,
    comment: 'Me encantó la decoración y el aroma del hotel. Cada detalle está muy bien cuidado.',
    date: '2024-03-18',
    approved: true
  },
  {
    id: '9',
    userId: 'u9',
    userName: 'Fernando Castro',
    rating: 5,
    comment: 'El mejor hotel en el que me he hospedado en Lima. Lujo y confort garantizados.',
    date: '2024-03-20',
    approved: true
  },
  {
    id: '10',
    userId: 'u10',
    userName: 'Patricia Loli',
    rating: 4,
    comment: 'Una estancia muy placentera. La piscina climatizada es fantástica.',
    date: '2024-03-22',
    approved: true
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'superadmin',
    name: 'Super Admin',
    email: 'superadmin@empresa.com',
    phone: '999888777',
    role: 'super_admin',
    password: 'super'
  },
  {
    id: 'admin',
    name: 'Administrador',
    email: 'admin@hotel.com',
    phone: '999999999',
    role: 'admin',
    password: 'admin',
    tenantId: '1',
  },
  {
    id: 'user',
    name: 'Juan Pérez',
    email: 'juan@gmail.com',
    phone: '987654321',
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
