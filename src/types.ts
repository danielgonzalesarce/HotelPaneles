export enum RoomType {
  Standard = 'Estándar',
  Double = 'Doble',
  Suite = 'Suite',
  PremiumSuite = 'Suite Premium'
}

export enum RoomStatus {
  Available = 'Disponible',
  Reserved = 'Reservada',
  Occupied = 'Ocupada',
  Cleaning = 'En limpieza',
  Maintenance = 'Mantenimiento'
}

export interface Room {
  id: string;
  number: string;
  floor: string; // Added floor field
  name: string;
  type: RoomType;
  description: string;
  price: number;
  capacity: number;
  images: string[];
  amenities: string[];
  featured?: boolean;
  status: RoomStatus;
}

export type InvoiceType = 'Boleta' | 'Factura';

export interface Invoice {
  id: string;
  reservationId: string;
  type: InvoiceType;
  series: string;
  correlativo: number;
  fullNumber: string;
  denomination: string;
  emissionDate: string;
  emissionTime?: string;
  clientName: string;
  clientDocument: string;
  clientDocumentType: ClientDocumentType;
  clientAddress?: string;
  paymentMethod: PaymentMethod;
  creditPendingAmount?: number;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  taxableAmount: number;
  igv: number;
  subtotal: number;
  extras: { name: string; price: number }[];
  total: number;
  igvRate: number;
  lines: InvoiceLineItem[];
  sunatStatus: SunatStatus;
  sunatMessage?: string;
  sunatHash?: string;
  sunatQr?: string;
  sunatPdfUrl?: string;
  sunatXmlUrl?: string;
  /** @deprecated use emissionDate */
  date: string;
}

export interface Reservation {
  id: string;
  roomId: string;
  roomName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'pending_payment';
  depositPaid?: number;
  remainingBalance?: number;
  extras: {
    breakfast: boolean;
    shuttle: boolean;
    extraBed: boolean;
  };
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  /** Sin roomId = reseña general del hotel (home). Con roomId = reseña de habitación. */
  roomId?: string;
  roomNumber?: string;
  roomName?: string;
  rating: number;
  comment: string;
  date: string;
  approved: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  role: 'user' | 'admin' | 'super_admin';
  password?: string;
  tenantId?: string;
}

export type TenantPlan = 'Básico' | 'Pro' | 'Enterprise';
export type RucSunatStatus = 'activo' | 'inactivo' | 'no_encontrado';

export interface TenantPermissions {
  maxRooms: number;
  maxUsers: number;
  billing: boolean;
  advancedReports: boolean;
  chatbot: boolean;
  multiSite: boolean;
}

export interface HotelConfig {
  name: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  description?: string;
  facebook?: string;
  instagram?: string;
  logo?: string;
  fiscal?: HotelFiscalConfig;
}

export interface HotelFiscalConfig {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  domicilioFiscal: string;
  esEmisorElectronico: boolean;
  boletaSeries: string;
  facturaSeries: string;
}

export type ClientDocumentType = 'DNI' | 'CE' | 'Pasaporte' | 'RUC';
export type PaymentMethod = 'Contado' | 'Credito';
export type SunatStatus = 'borrador' | 'simulado' | 'aceptado' | 'rechazado' | 'pendiente';

export interface InvoiceLineItem {
  quantity: number;
  description: string;
  unitPrice: number;
  subtotal: number;
}

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
}

export interface Complaint {
  id: string;
  date: string;
  fullName: string;
  documentType: 'DNI' | 'CE' | 'Pasaporte';
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
  type: 'Reclamo' | 'Queja';
  description: string;
  status: 'Pendiente' | 'Atendido';
}

export interface Tenant {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  ruc: string;
  razonSocial?: string;
  rucStatus?: RucSunatStatus;
  plan: TenantPlan;
  permissions?: TenantPermissions;
  status: 'Activo' | 'Inactivo' | 'Suspendido';
  createdAt: string;
  nextBillingDate: string;
  monthlyFee: number;
  theme?: {
    primaryColor: string;
    logoUrl?: string;
    coverUrl?: string;
  };
}

export interface TenantInvoice {
  id: string;
  tenantId: string;
  tenantName: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'Pagado' | 'Pendiente' | 'Vencido';
  plan: 'Básico' | 'Pro' | 'Enterprise';
}

export interface GlobalConfig {
  platformName: string;
  platformAddress?: string;
  supportEmail: string;
  supportPhone: string;
  defaultCurrency: string;
  fiscal?: HotelFiscalConfig;
  plans: {
    basic: { price: number; maxRooms: number; maxUsers: number };
    pro: { price: number; maxRooms: number; maxUsers: number };
    enterprise: { price: number; maxRooms: number; maxUsers: number };
  };
}
