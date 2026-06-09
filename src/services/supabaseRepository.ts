import type {
  Room,
  Reservation,
  Review,
  User,
  HotelConfig,
  GalleryImage,
  Invoice,
  Complaint,
  Tenant,
  TenantInvoice,
  GlobalConfig,
} from '../types';
import { normalizeInvoice } from '../utils/invoiceHelpers';
import { getSupabase } from '../lib/supabase';
import {
  INITIAL_ROOMS,
  INITIAL_REVIEWS,
  INITIAL_USERS,
  INITIAL_CONFIG,
  INITIAL_GALLERY,
  INITIAL_TENANTS,
} from '../data/initialData';

export interface StorageSnapshot {
  rooms: Room[];
  reservations: Reservation[];
  reviews: Review[];
  users: User[];
  config: HotelConfig;
  gallery: GalleryImage[];
  invoices: Invoice[];
  complaints: Complaint[];
  tenants: Tenant[];
  tenantInvoices: TenantInvoice[];
  globalConfig: GlobalConfig;
}

const INITIAL_GLOBAL_CONFIG: GlobalConfig = {
  platformName: 'Lumina SaaS',
  supportEmail: 'soporte@lumina.com',
  supportPhone: '+1234567890',
  defaultCurrency: 'PEN',
  plans: {
    basic: { price: 99, maxRooms: 10, maxUsers: 2 },
    pro: { price: 199, maxRooms: 50, maxUsers: 10 },
    enterprise: { price: 499, maxRooms: 999, maxUsers: 999 },
  },
};

function mapRoom(row: Record<string, unknown>): Room {
  return {
    id: String(row.id),
    number: String(row.number),
    floor: String(row.floor ?? '1'),
    name: String(row.name),
    type: row.type as Room['type'],
    description: String(row.description ?? ''),
    price: Number(row.price),
    capacity: Number(row.capacity),
    images: (row.images as string[]) ?? [],
    amenities: (row.amenities as string[]) ?? [],
    featured: Boolean(row.featured),
    status: row.status as Room['status'],
  };
}

function mapReservation(row: Record<string, unknown>): Reservation {
  return {
    id: String(row.id),
    roomId: String(row.room_id),
    roomName: String(row.room_name),
    userId: String(row.user_id),
    userName: String(row.user_name),
    userEmail: String(row.user_email),
    userPhone: String(row.user_phone ?? ''),
    checkIn: String(row.check_in),
    checkOut: String(row.check_out),
    guests: Number(row.guests),
    totalPrice: Number(row.total_price),
    depositPaid: row.deposit_paid != null ? Number(row.deposit_paid) : undefined,
    remainingBalance:
      row.remaining_balance != null ? Number(row.remaining_balance) : undefined,
    status: row.status as Reservation['status'],
    extras: (row.extras as Reservation['extras']) ?? {
      breakfast: false,
      shuttle: false,
      extraBed: false,
    },
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapReview(row: Record<string, unknown>): Review {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.user_name),
    userAvatarUrl: row.user_avatar_url ? String(row.user_avatar_url) : undefined,
    roomId: row.room_id ? String(row.room_id) : undefined,
    roomNumber: row.room_number ? String(row.room_number) : undefined,
    roomName: row.room_name ? String(row.room_name) : undefined,
    rating: Number(row.rating),
    comment: String(row.comment),
    date: String(row.review_date ?? row.date ?? new Date().toISOString().slice(0, 10)),
    approved: Boolean(row.approved),
  };
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone ?? ''),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    role: row.role as User['role'],
    password: row.password ? String(row.password) : undefined,
  };
}

function mapConfig(row: Record<string, unknown>): HotelConfig {
  return {
    name: String(row.name),
    address: String(row.address),
    phone: String(row.phone),
    email: String(row.email),
    whatsapp: String(row.whatsapp),
    description: row.description ? String(row.description) : undefined,
    facebook: row.facebook ? String(row.facebook) : undefined,
    instagram: row.instagram ? String(row.instagram) : undefined,
    logo: row.logo ? String(row.logo) : undefined,
  };
}

function mapGallery(row: Record<string, unknown>): GalleryImage {
  return {
    id: String(row.id),
    url: String(row.url),
    title: String(row.title),
  };
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  const metadata = (row.metadata as Record<string, unknown> | undefined) ?? {};
  return normalizeInvoice({
    id: String(row.id),
    reservationId: String(row.reservation_id),
    type: row.type as Invoice['type'],
    clientName: String(row.client_name),
    clientDocument: String(row.client_document),
    roomNumber: String(row.room_number),
    checkIn: String(row.check_in),
    checkOut: String(row.check_out),
    subtotal: Number(row.subtotal),
    extras: (row.extras as Invoice['extras']) ?? [],
    total: Number(row.total),
    date: String(row.invoice_date ?? row.date ?? new Date().toISOString().slice(0, 10)),
    ...metadata,
  });
}

function mapComplaint(row: Record<string, unknown>): Complaint {
  return {
    id: String(row.id),
    date: String(row.complaint_date ?? row.date),
    fullName: String(row.full_name),
    documentType: row.document_type as Complaint['documentType'],
    documentNumber: String(row.document_number),
    email: String(row.email),
    phone: String(row.phone),
    address: String(row.address),
    type: row.type as Complaint['type'],
    description: String(row.description),
    status: row.status as Complaint['status'],
  };
}

function mapTenant(row: Record<string, unknown>): Tenant {
  return {
    id: String(row.id),
    name: String(row.name),
    contactName: String(row.contact_name),
    email: String(row.email),
    phone: String(row.phone),
    ruc: String(row.ruc ?? ''),
    razonSocial: row.razon_social ? String(row.razon_social) : undefined,
    rucStatus: row.ruc_status as Tenant['rucStatus'] | undefined,
    plan: row.plan as Tenant['plan'],
    permissions: row.permissions as Tenant['permissions'] | undefined,
    status: row.status as Tenant['status'],
    createdAt: String(row.created_at),
    nextBillingDate: String(row.next_billing_date),
    monthlyFee: Number(row.monthly_fee),
    theme: (row.theme as Tenant['theme']) ?? undefined,
  };
}

function mapTenantInvoice(row: Record<string, unknown>): TenantInvoice {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name),
    date: String(row.invoice_date ?? row.date),
    dueDate: String(row.due_date),
    amount: Number(row.amount),
    status: row.status as TenantInvoice['status'],
    plan: row.plan as TenantInvoice['plan'],
  };
}

function mapGlobalConfig(row: Record<string, unknown>): GlobalConfig {
  return {
    platformName: String(row.platform_name),
    supportEmail: String(row.support_email),
    supportPhone: String(row.support_phone),
    defaultCurrency: String(row.default_currency),
    plans: row.plans as GlobalConfig['plans'],
  };
}

export function roomToRow(room: Room) {
  return {
    id: room.id,
    number: room.number,
    floor: room.floor,
    name: room.name,
    type: room.type,
    description: room.description,
    price: room.price,
    capacity: room.capacity,
    images: room.images,
    amenities: room.amenities,
    featured: room.featured ?? false,
    status: room.status,
  };
}

export function reservationToRow(res: Reservation) {
  return {
    id: res.id,
    room_id: res.roomId,
    room_name: res.roomName,
    user_id: res.userId,
    user_name: res.userName,
    user_email: res.userEmail,
    user_phone: res.userPhone,
    check_in: res.checkIn,
    check_out: res.checkOut,
    guests: res.guests,
    total_price: res.totalPrice,
    deposit_paid: res.depositPaid ?? null,
    remaining_balance: res.remainingBalance ?? null,
    status: res.status,
    extras: res.extras,
    created_at: res.createdAt,
  };
}

export function reviewToRow(review: Review) {
  return {
    id: review.id,
    user_id: review.userId,
    user_name: review.userName,
    user_avatar_url: review.userAvatarUrl ?? null,
    room_id: review.roomId ?? null,
    room_number: review.roomNumber ?? null,
    room_name: review.roomName ?? null,
    rating: review.rating,
    comment: review.comment,
    review_date: review.date,
    approved: review.approved,
  };
}

export function userToRow(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatarUrl ?? null,
    role: user.role,
    password: user.password ?? null,
  };
}

export function configToRow(config: HotelConfig) {
  return {
    id: 'default',
    name: config.name,
    address: config.address,
    phone: config.phone,
    email: config.email,
    whatsapp: config.whatsapp,
    description: config.description ?? null,
    facebook: config.facebook ?? null,
    instagram: config.instagram ?? null,
    logo: config.logo ?? null,
  };
}

export function galleryToRow(image: GalleryImage) {
  return { id: image.id, url: image.url, title: image.title };
}

export function invoiceToRow(invoice: Invoice) {
  const normalized = normalizeInvoice(invoice);
  return {
    id: normalized.fullNumber || normalized.id,
    reservation_id: normalized.reservationId,
    type: normalized.type,
    client_name: normalized.clientName,
    client_document: normalized.clientDocument,
    room_number: normalized.roomNumber,
    check_in: normalized.checkIn,
    check_out: normalized.checkOut,
    subtotal: normalized.subtotal,
    extras: normalized.extras,
    total: normalized.total,
    invoice_date: normalized.emissionDate || normalized.date,
    metadata: {
      series: normalized.series,
      correlativo: normalized.correlativo,
      fullNumber: normalized.fullNumber,
      denomination: normalized.denomination,
      emissionDate: normalized.emissionDate,
      emissionTime: normalized.emissionTime,
      clientDocumentType: normalized.clientDocumentType,
      clientAddress: normalized.clientAddress,
      paymentMethod: normalized.paymentMethod,
      creditPendingAmount: normalized.creditPendingAmount,
      taxableAmount: normalized.taxableAmount,
      igv: normalized.igv,
      igvRate: normalized.igvRate,
      lines: normalized.lines,
      sunatStatus: normalized.sunatStatus,
      sunatMessage: normalized.sunatMessage,
      sunatHash: normalized.sunatHash,
      sunatQr: normalized.sunatQr,
      sunatPdfUrl: normalized.sunatPdfUrl,
      sunatXmlUrl: normalized.sunatXmlUrl,
    },
  };
}

export function complaintToRow(complaint: Complaint) {
  return {
    id: complaint.id,
    complaint_date: complaint.date,
    full_name: complaint.fullName,
    document_type: complaint.documentType,
    document_number: complaint.documentNumber,
    email: complaint.email,
    phone: complaint.phone,
    address: complaint.address,
    type: complaint.type,
    description: complaint.description,
    status: complaint.status,
  };
}

export function tenantToRow(tenant: Tenant) {
  return {
    id: tenant.id,
    name: tenant.name,
    contact_name: tenant.contactName,
    email: tenant.email,
    phone: tenant.phone,
    ruc: tenant.ruc,
    razon_social: tenant.razonSocial ?? null,
    ruc_status: tenant.rucStatus ?? null,
    permissions: tenant.permissions ?? null,
    plan: tenant.plan,
    status: tenant.status,
    created_at: tenant.createdAt,
    next_billing_date: tenant.nextBillingDate,
    monthly_fee: tenant.monthlyFee,
    theme: tenant.theme ?? {},
  };
}

export function tenantInvoiceToRow(invoice: TenantInvoice) {
  return {
    id: invoice.id,
    tenant_id: invoice.tenantId,
    tenant_name: invoice.tenantName,
    invoice_date: invoice.date,
    due_date: invoice.dueDate,
    amount: invoice.amount,
    status: invoice.status,
    plan: invoice.plan,
  };
}

export function globalConfigToRow(config: GlobalConfig) {
  return {
    id: 'default',
    platform_name: config.platformName,
    support_email: config.supportEmail,
    support_phone: config.supportPhone,
    default_currency: config.defaultCurrency,
    plans: config.plans,
  };
}

export async function fetchStorageSnapshot(): Promise<StorageSnapshot> {
  const supabase = getSupabase();

  const [
    roomsRes,
    reservationsRes,
    reviewsRes,
    usersRes,
    configRes,
    galleryRes,
    invoicesRes,
    complaintsRes,
    tenantsRes,
    tenantInvoicesRes,
    globalConfigRes,
  ] = await Promise.all([
    supabase.from('rooms').select('*').order('number'),
    supabase.from('reservations').select('*').order('created_at', { ascending: false }),
    supabase.from('reviews').select('*').order('review_date', { ascending: false }),
    supabase.from('users').select('*'),
    supabase.from('hotel_config').select('*').eq('id', 'default').maybeSingle(),
    supabase.from('gallery_images').select('*'),
    supabase.from('invoices').select('*').order('invoice_date', { ascending: false }),
    supabase.from('complaints').select('*').order('created_at', { ascending: false }),
    supabase.from('tenants').select('*'),
    supabase.from('tenant_invoices').select('*'),
    supabase.from('global_config').select('*').eq('id', 'default').maybeSingle(),
  ]);

  const firstError =
    roomsRes.error ||
    reservationsRes.error ||
    reviewsRes.error ||
    usersRes.error ||
    configRes.error ||
    galleryRes.error ||
    invoicesRes.error ||
    complaintsRes.error ||
    tenantsRes.error ||
    tenantInvoicesRes.error ||
    globalConfigRes.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    rooms: (roomsRes.data ?? []).map(mapRoom),
    reservations: (reservationsRes.data ?? []).map(mapReservation),
    reviews: (reviewsRes.data ?? []).map(mapReview),
    users: (usersRes.data ?? []).map(mapUser),
    config: configRes.data ? mapConfig(configRes.data) : INITIAL_CONFIG,
    gallery: (galleryRes.data ?? []).map(mapGallery),
    invoices: (invoicesRes.data ?? []).map(mapInvoice),
    complaints: (complaintsRes.data ?? []).map(mapComplaint),
    tenants: (tenantsRes.data ?? []).map(mapTenant),
    tenantInvoices: (tenantInvoicesRes.data ?? []).map(mapTenantInvoice),
    globalConfig: globalConfigRes.data
      ? mapGlobalConfig(globalConfigRes.data)
      : INITIAL_GLOBAL_CONFIG,
  };
}

export async function seedSupabaseIfEmpty(): Promise<boolean> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return false;

  const results = await Promise.all([
    supabase.from('rooms').insert(INITIAL_ROOMS.map(roomToRow)),
    supabase.from('reviews').insert(INITIAL_REVIEWS.map(reviewToRow)),
    supabase.from('users').insert(INITIAL_USERS.map(userToRow)),
    supabase.from('hotel_config').upsert(configToRow(INITIAL_CONFIG)),
    supabase.from('gallery_images').insert(INITIAL_GALLERY.map(galleryToRow)),
    supabase.from('tenants').insert(INITIAL_TENANTS.map(tenantToRow)),
    supabase.from('global_config').upsert(globalConfigToRow(INITIAL_GLOBAL_CONFIG)),
  ]);

  const seedError = results.find((r) => r.error)?.error;
  if (seedError) throw new Error(seedError.message);

  return true;
}

export async function upsertRoom(room: Room) {
  const { error } = await getSupabase().from('rooms').upsert(roomToRow(room));
  if (error) throw new Error(error.message);
}

export async function deleteRoomDb(id: string) {
  const { error } = await getSupabase().from('rooms').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertReservation(res: Reservation) {
  const { error } = await getSupabase().from('reservations').upsert(reservationToRow(res));
  if (error) throw new Error(error.message);
}

export async function deleteReservationDb(id: string) {
  const { error } = await getSupabase().from('reservations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertReview(review: Review) {
  const { error } = await getSupabase().from('reviews').upsert(reviewToRow(review));
  if (error) throw new Error(error.message);
}

export async function deleteReviewDb(id: string) {
  const { error } = await getSupabase().from('reviews').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertUser(user: User) {
  const { error } = await getSupabase().from('users').upsert(userToRow(user));
  if (error) throw new Error(error.message);
}

export async function upsertConfig(config: HotelConfig) {
  const { error } = await getSupabase().from('hotel_config').upsert(configToRow(config));
  if (error) throw new Error(error.message);
}

export async function upsertGalleryImage(image: GalleryImage) {
  const { error } = await getSupabase().from('gallery_images').upsert(galleryToRow(image));
  if (error) throw new Error(error.message);
}

export async function deleteGalleryImageDb(id: string) {
  const { error } = await getSupabase().from('gallery_images').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertInvoice(invoice: Invoice) {
  const { error } = await getSupabase().from('invoices').upsert(invoiceToRow(invoice));
  if (error) throw new Error(error.message);
}

export async function upsertComplaint(complaint: Complaint) {
  const { error } = await getSupabase().from('complaints').upsert(complaintToRow(complaint));
  if (error) throw new Error(error.message);
}

export async function deleteComplaintDb(id: string) {
  const { error } = await getSupabase().from('complaints').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertTenant(tenant: Tenant) {
  const { error } = await getSupabase().from('tenants').upsert(tenantToRow(tenant));
  if (error) throw new Error(error.message);
}

export async function deleteTenantDb(id: string) {
  const { error } = await getSupabase().from('tenants').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertTenantInvoice(invoice: TenantInvoice) {
  const { error } = await getSupabase().from('tenant_invoices').upsert(tenantInvoiceToRow(invoice));
  if (error) throw new Error(error.message);
}

export async function deleteTenantInvoiceDb(id: string) {
  const { error } = await getSupabase().from('tenant_invoices').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function upsertGlobalConfig(config: GlobalConfig) {
  const { error } = await getSupabase().from('global_config').upsert(globalConfigToRow(config));
  if (error) throw new Error(error.message);
}

export async function upsertReviews(reviews: Review[]) {
  if (reviews.length === 0) return;
  const { error } = await getSupabase().from('reviews').upsert(reviews.map(reviewToRow));
  if (error) throw new Error(error.message);
}

export async function upsertRooms(rooms: Room[]) {
  if (rooms.length === 0) return;
  const { error } = await getSupabase().from('rooms').upsert(rooms.map(roomToRow));
  if (error) throw new Error(error.message);
}
