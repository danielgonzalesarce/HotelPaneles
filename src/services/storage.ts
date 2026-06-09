import {
  Room,
  Reservation,
  Review,
  User,
  HotelConfig,
  Invoice,
  RoomStatus,
  GalleryImage,
  Complaint,
  Tenant,
  TenantInvoice,
  GlobalConfig,
} from '../types';
import { INITIAL_ROOMS, INITIAL_REVIEWS, INITIAL_USERS, INITIAL_CONFIG, INITIAL_GALLERY, INITIAL_TENANTS, createRoomReviewEntry, reviewsPerRoom, imagesForRoomType } from '../data/initialData';
import { buildAvatarFromName, resolveReviewAvatar } from '../utils/userAvatar';

function enrichUsers(users: User[]): { users: User[]; changed: boolean } {
  let changed = false;
  const enriched = users.map((u) => {
    if (u.avatarUrl?.trim()) return u;
    changed = true;
    return { ...u, avatarUrl: buildAvatarFromName(u.name) };
  });
  return { users: enriched, changed };
}

const LEGACY_ROOM_REVIEW_IDS = new Set(['11', '12', '13', '14', '15', '16', '17', '18']);

function stripLegacyRoomReviews(reviews: Review[]): Review[] {
  return reviews.filter((r) => !LEGACY_ROOM_REVIEW_IDS.has(r.id));
}

function mergeReviewsWithSeed(reviews: Review[]): Review[] {
  const cleaned = stripLegacyRoomReviews(reviews);
  const seedById = new Map(INITIAL_REVIEWS.map((r) => [r.id, r]));
  return cleaned.map((review) => {
    const seed = seedById.get(review.id);
    if (!seed) return review;
    return {
      ...review,
      userAvatarUrl: review.userAvatarUrl ?? seed.userAvatarUrl,
      roomId: review.roomId ?? seed.roomId,
      roomNumber: review.roomNumber ?? seed.roomNumber,
      roomName: review.roomName ?? seed.roomName,
    };
  });
}

function enrichReviews(reviews: Review[], users: User[]): { reviews: Review[]; changed: boolean } {
  let changed = false;
  const enriched = reviews.map((r) => {
    if (r.userAvatarUrl?.trim()) return r;
    changed = true;
    return { ...r, userAvatarUrl: resolveReviewAvatar(r, users) };
  });
  return { reviews: enriched, changed };
}

/** Garantiza 3–4 reseñas por cada habitación del inventario actual. */
function ensureRoomReviewsForInventory(
  reviews: Review[],
  rooms: Room[]
): { reviews: Review[]; changed: boolean } {
  let changed = false;
  const result = [...reviews];
  const existingIds = new Set(result.map((r) => r.id));

  for (const room of rooms) {
    for (let i = 0; i < reviewsPerRoom(room.id); i++) {
      const entry = createRoomReviewEntry(room, i);
      if (!existingIds.has(entry.id)) {
        result.push(entry);
        existingIds.add(entry.id);
        changed = true;
      }
    }
  }

  return { reviews: result, changed };
}

function normalizeReviewCatalog(
  raw: Review[],
  rooms: Room[],
  users: User[]
): { reviews: Review[]; changed: boolean } {
  let reviews = stripLegacyRoomReviews(raw);
  let changed = reviews.length !== raw.length;

  const knownIds = new Set(reviews.map((r) => r.id));
  for (const seed of INITIAL_REVIEWS) {
    if (!knownIds.has(seed.id)) {
      reviews.push(seed);
      knownIds.add(seed.id);
      changed = true;
    }
  }

  const roomSync = ensureRoomReviewsForInventory(reviews, rooms);
  reviews = roomSync.reviews;
  changed = changed || roomSync.changed;

  const merged = mergeReviewsWithSeed(reviews);
  if (JSON.stringify(merged) !== JSON.stringify(reviews)) changed = true;
  reviews = merged;

  const { reviews: enriched, changed: avatarChanged } = enrichReviews(reviews, users);
  changed = changed || avatarChanged;

  return { reviews: enriched, changed };
}

const MIN_ROOM_IMAGES = 4;

function normalizeRoomImages(rooms: Room[]): { rooms: Room[]; changed: boolean } {
  const seedById = new Map(INITIAL_ROOMS.map((r) => [r.id, r]));
  let changed = false;

  const normalized = rooms.map((room) => {
    const seed = seedById.get(room.id);
    const target =
      seed?.images?.length >= MIN_ROOM_IMAGES
        ? seed.images.slice(0, MIN_ROOM_IMAGES)
        : imagesForRoomType(room.type).slice(0, MIN_ROOM_IMAGES);

    const currentKey = (room.images ?? []).slice(0, MIN_ROOM_IMAGES).join('|');
    const targetKey = target.join('|');
    if (currentKey === targetKey) return room;

    changed = true;
    return { ...room, images: target };
  });

  return { rooms: normalized, changed };
}

function normalizeRoomsCatalog(raw: Room[]): { rooms: Room[]; changed: boolean } {
  let rooms = raw;
  let changed = false;

  const existingIds = new Set(rooms.map((r) => r.id));
  const missing = INITIAL_ROOMS.filter((r) => !existingIds.has(r.id));
  if (missing.length > 0) {
    rooms = [...rooms, ...missing];
    changed = true;
  }

  rooms = rooms.map((r) => ({
    ...r,
    status: r.status || RoomStatus.Available,
    number: r.number || r.id,
  }));

  const imageSync = normalizeRoomImages(rooms);
  rooms = imageSync.rooms;
  changed = changed || imageSync.changed;

  return { rooms, changed };
}

import { normalizeInvoice } from '../utils/invoiceHelpers';
import { isSupabaseConfigured, type StorageSource } from '../lib/supabase';
import {
  fetchStorageSnapshot,
  seedSupabaseIfEmpty,
  upsertRoom,
  upsertRooms,
  deleteRoomDb,
  upsertReservation,
  deleteReservationDb,
  upsertReview,
  upsertReviews,
  deleteReviewDb,
  upsertUser,
  upsertConfig,
  upsertGalleryImage,
  deleteGalleryImageDb,
  upsertInvoice,
  upsertComplaint,
  deleteComplaintDb,
  upsertTenant,
  deleteTenantDb,
  upsertTenantInvoice,
  deleteTenantInvoiceDb,
  upsertGlobalConfig,
  type StorageSnapshot,
} from './supabaseRepository';
import { syncRoomStatusForRoom } from './roomAvailability';
import { resolvePlanPermissions } from '../../lib/tenant/planPermissions.js';
import type { TenantPermissions } from '../types';

const LUMINA_TENANT_ID = '1';

function mergeConfigDefaults(config: HotelConfig): HotelConfig {
  return {
    ...INITIAL_CONFIG,
    ...config,
    fiscal: {
      ...INITIAL_CONFIG.fiscal,
      ...config.fiscal,
    },
  };
}

function mergeTenantDefaults(tenant: Tenant): Tenant {
  const seed = tenant.id === LUMINA_TENANT_ID ? INITIAL_TENANTS[0] : null;
  const plans = memoryCache?.globalConfig?.plans ?? INITIAL_GLOBAL_CONFIG.plans;
  const plan = tenant.plan ?? seed?.plan ?? 'Básico';
  return {
    ...(seed ?? {}),
    ...tenant,
    ruc: tenant.ruc || seed?.ruc || '',
    razonSocial: tenant.razonSocial || seed?.razonSocial,
    rucStatus: tenant.rucStatus || seed?.rucStatus,
    permissions: tenant.permissions ?? resolvePlanPermissions(plan, plans),
  };
}

function normalizeTenantsList(tenants: Tenant[]): Tenant[] {
  const merged = tenants.map(mergeTenantDefaults);
  const lumina = merged.find((t) => t.id === LUMINA_TENANT_ID) ?? INITIAL_TENANTS[0];
  const removedIds = merged.filter((t) => t.id !== LUMINA_TENANT_ID).map((t) => t.id);

  if (removedIds.length === 0 && merged.length === 1) {
    return merged;
  }

  const normalized = [mergeTenantDefaults(lumina)];
  localStorage.setItem(KEYS.TENANTS, JSON.stringify(normalized));
  if (memoryCache) memoryCache.tenants = normalized;

  removedIds.forEach((id) => syncToSupabase(() => deleteTenantDb(id).then()));
  syncToSupabase(() => upsertTenant(lumina).then());

  return normalized;
}

const KEYS = {
  ROOMS: 'hotel_rooms',
  RESERVATIONS: 'hotel_reservations',
  REVIEWS: 'hotel_reviews',
  USERS: 'hotel_users',
  CONFIG: 'hotel_config',
  CURRENT_USER: 'hotel_current_user',
  INVOICES: 'hotel_invoices',
  GALLERY: 'hotel_gallery',
  COMPLAINTS: 'hotel_complaints',
  TENANTS: 'hotel_tenants',
  TENANT_INVOICES: 'hotel_tenant_invoices',
  PLATFORM_INVOICES: 'hotel_platform_invoices',
  GLOBAL_CONFIG: 'hotel_global_config',
};

const INITIAL_GLOBAL_CONFIG: GlobalConfig = {
  platformName: 'Lumina SaaS',
  platformAddress: 'Av. SaaS 500, San Isidro, Lima, Perú',
  supportEmail: 'soporte@lumina.com',
  supportPhone: '+51 1 555 0100',
  defaultCurrency: 'PEN',
  fiscal: {
    ruc: '20123456789',
    razonSocial: 'Lumina SaaS Platform S.A.C.',
    nombreComercial: 'Lumina SaaS',
    domicilioFiscal: 'Av. SaaS 500, San Isidro, Lima, Perú',
    esEmisorElectronico: true,
    boletaSeries: 'B001',
    facturaSeries: 'F001',
  },
  plans: {
    basic: { price: 99, maxRooms: 10, maxUsers: 2 },
    pro: { price: 199, maxRooms: 50, maxUsers: 10 },
    enterprise: { price: 499, maxRooms: 999, maxUsers: 999 },
  },
};

function mergeGlobalConfigDefaults(config: GlobalConfig): GlobalConfig {
  return {
    ...INITIAL_GLOBAL_CONFIG,
    ...config,
    fiscal: {
      ...INITIAL_GLOBAL_CONFIG.fiscal,
      ...config.fiscal,
    },
    plans: {
      ...INITIAL_GLOBAL_CONFIG.plans,
      ...config.plans,
    },
  };
}

let memoryCache: StorageSnapshot | null = null;
let storageSource: StorageSource = 'local';
let supabaseEnabled = false;

function syncToSupabase(task: () => Promise<void>) {
  if (!supabaseEnabled) return;
  task().catch((error) => console.error('[Supabase sync]', error));
}

function persistSnapshot(snapshot: StorageSnapshot) {
  localStorage.setItem(KEYS.ROOMS, JSON.stringify(snapshot.rooms));
  localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(snapshot.reservations));
  localStorage.setItem(KEYS.REVIEWS, JSON.stringify(snapshot.reviews));
  localStorage.setItem(KEYS.USERS, JSON.stringify(snapshot.users));
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(snapshot.config));
  localStorage.setItem(KEYS.GALLERY, JSON.stringify(snapshot.gallery));
  localStorage.setItem(KEYS.INVOICES, JSON.stringify(snapshot.invoices));
  localStorage.setItem(KEYS.COMPLAINTS, JSON.stringify(snapshot.complaints));
  localStorage.setItem(KEYS.TENANTS, JSON.stringify(snapshot.tenants));
  localStorage.setItem(KEYS.TENANT_INVOICES, JSON.stringify(snapshot.tenantInvoices));
  localStorage.setItem(KEYS.GLOBAL_CONFIG, JSON.stringify(snapshot.globalConfig));
}

function ensureCachePartial(): StorageSnapshot {
  if (!memoryCache) {
    memoryCache = {
      rooms: storage.getRooms(),
      reservations: storage.getReservations(),
      reviews: storage.getReviews(),
      users: storage.getUsers(),
      config: storage.getConfig(),
      gallery: storage.getGallery(),
      invoices: storage.getInvoices(),
      complaints: storage.getComplaints(),
      tenants: storage.getTenants(),
      tenantInvoices: storage.getTenantInvoices(),
      globalConfig: storage.getGlobalConfig(),
    };
  }
  return memoryCache;
}

export async function initStorage(): Promise<StorageSource> {
  if (!isSupabaseConfigured()) {
    storageSource = 'local';
    supabaseEnabled = false;
    return storageSource;
  }

  try {
    supabaseEnabled = true;
    await seedSupabaseIfEmpty();
    const snapshot = await fetchStorageSnapshot();
    snapshot.tenants = normalizeTenantsList(snapshot.tenants);
    memoryCache = snapshot;
    persistSnapshot(snapshot);
    storageSource = 'supabase';
    return storageSource;
  } catch (error) {
    console.error('[Supabase init] Falling back to localStorage:', error);
    supabaseEnabled = false;
    storageSource = 'local';
    memoryCache = null;
    return storageSource;
  }
}

export function getStorageSource(): StorageSource {
  return storageSource;
}

export function resetStorageCacheForTests() {
  memoryCache = null;
  storageSource = 'local';
  supabaseEnabled = false;
}

export const storage = {
  getRooms: (): Room[] => {
    if (memoryCache?.rooms) {
      const before = JSON.stringify(memoryCache.rooms);
      const { rooms: normalized, changed } = normalizeRoomsCatalog(memoryCache.rooms);
      if (changed || before !== JSON.stringify(normalized)) {
        memoryCache.rooms = normalized;
        localStorage.setItem(KEYS.ROOMS, JSON.stringify(normalized));
      }
      return normalized;
    }

    const data = localStorage.getItem(KEYS.ROOMS);
    let rooms: Room[] = [];

    if (!data) {
      rooms = INITIAL_ROOMS;
    } else {
      try {
        rooms = JSON.parse(data);
      } catch (e) {
        console.error('Error parsing rooms', e);
        rooms = INITIAL_ROOMS;
      }
    }

    const before = JSON.stringify(rooms);
    const { rooms: normalized, changed } = normalizeRoomsCatalog(rooms);
    if (changed || !data || before !== JSON.stringify(normalized)) {
      localStorage.setItem(KEYS.ROOMS, JSON.stringify(normalized));
    }

    if (memoryCache) memoryCache.rooms = normalized;
    return normalized;
  },

  saveRoom: (room: Room) => {
    const cache = ensureCachePartial();
    const index = cache.rooms.findIndex((r) => r.id === room.id);
    if (index < 0) {
      const check = storage.canAddRoom();
      if (!check.ok) {
        throw new Error(check.message || 'Límite de habitaciones alcanzado.');
      }
    }
    if (index >= 0) cache.rooms[index] = room;
    else cache.rooms.push(room);
    localStorage.setItem(KEYS.ROOMS, JSON.stringify(cache.rooms));
    syncToSupabase(() => upsertRoom(room).then());
  },

  updateRoomStatus: (id: string, status: RoomStatus) => {
    const cache = ensureCachePartial();
    const index = cache.rooms.findIndex((r) => r.id === id);
    if (index >= 0) {
      cache.rooms[index].status = status;
      localStorage.setItem(KEYS.ROOMS, JSON.stringify(cache.rooms));
      syncToSupabase(() => upsertRoom(cache.rooms[index]).then());
    }
  },

  deleteRoom: (id: string) => {
    const cache = ensureCachePartial();
    cache.rooms = cache.rooms.filter((r) => r.id !== id);
    localStorage.setItem(KEYS.ROOMS, JSON.stringify(cache.rooms));
    syncToSupabase(() => deleteRoomDb(id).then());
  },

  getReservations: (): Reservation[] => {
    if (memoryCache?.reservations) return memoryCache.reservations;
    const data = localStorage.getItem(KEYS.RESERVATIONS);
    try {
      const reservations = data ? JSON.parse(data) : [];
      if (memoryCache) memoryCache.reservations = reservations;
      return reservations;
    } catch (e) {
      console.error('Error parsing reservations', e);
      return [];
    }
  },

  saveReservation: (res: Reservation) => {
    const cache = ensureCachePartial();
    const index = cache.reservations.findIndex((r) => r.id === res.id);
    if (index >= 0) cache.reservations[index] = res;
    else cache.reservations.push(res);
    localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(cache.reservations));
    syncToSupabase(() => upsertReservation(res).then());
  },

  updateReservationStatus: (id: string, status: Reservation['status']) => {
    const cache = ensureCachePartial();
    const index = cache.reservations.findIndex((r) => r.id === id);
    if (index >= 0) {
      cache.reservations[index].status = status;
      localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(cache.reservations));
      syncToSupabase(() => upsertReservation(cache.reservations[index]).then());

      const roomId = cache.reservations[index].roomId;
      if (status === 'cancelled') {
        syncRoomStatusForRoom(roomId);
      }
    }
  },

  deleteReservation: (id: string) => {
    const cache = ensureCachePartial();
    cache.reservations = cache.reservations.filter((r) => r.id !== id);
    localStorage.setItem(KEYS.RESERVATIONS, JSON.stringify(cache.reservations));
    syncToSupabase(() => deleteReservationDb(id).then());
  },

  getInvoices: (): Invoice[] => {
    if (memoryCache?.invoices) return memoryCache.invoices.map(normalizeInvoice);
    const data = localStorage.getItem(KEYS.INVOICES);
    try {
      const invoices: Invoice[] = data ? JSON.parse(data) : [];
      const normalized = invoices.map(normalizeInvoice);
      if (memoryCache) memoryCache.invoices = normalized;
      return normalized;
    } catch (e) {
      console.error('Error parsing invoices', e);
      return [];
    }
  },

  saveInvoice: (invoice: Invoice) => {
    const cache = ensureCachePartial();
    const normalized = normalizeInvoice(invoice);
    const index = cache.invoices.findIndex(
      (i) => i.id === normalized.id || i.fullNumber === normalized.fullNumber
    );
    if (index >= 0) cache.invoices[index] = normalized;
    else cache.invoices.push(normalized);
    localStorage.setItem(KEYS.INVOICES, JSON.stringify(cache.invoices));
    syncToSupabase(() => upsertInvoice(normalized).then());
  },

  getReviews: (): Review[] => {
    const users = storage.getUsers();
    const rooms = storage.getRooms();

    if (memoryCache?.reviews) {
      const before = JSON.stringify(memoryCache.reviews);
      const { reviews: normalized, changed } = normalizeReviewCatalog(memoryCache.reviews, rooms, users);
      if (changed || before !== JSON.stringify(normalized)) {
        memoryCache.reviews = normalized;
        localStorage.setItem(KEYS.REVIEWS, JSON.stringify(normalized));
      }
      return normalized;
    }

    const data = localStorage.getItem(KEYS.REVIEWS);
    let reviews: Review[] = [];

    if (!data) {
      reviews = INITIAL_REVIEWS;
    } else {
      try {
        reviews = JSON.parse(data);
      } catch (e) {
        console.error('Error parsing reviews', e);
        reviews = INITIAL_REVIEWS;
      }
    }

    const before = JSON.stringify(reviews);
    const { reviews: normalized, changed } = normalizeReviewCatalog(reviews, rooms, users);
    if (changed || !data || before !== JSON.stringify(normalized)) {
      localStorage.setItem(KEYS.REVIEWS, JSON.stringify(normalized));
    }

    if (memoryCache) memoryCache.reviews = normalized;
    return normalized;
  },

  saveReview: (review: Review) => {
    const cache = ensureCachePartial();
    cache.reviews.push(review);
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify(cache.reviews));
    syncToSupabase(() => upsertReview(review).then());
  },

  approveReview: (id: string) => {
    const cache = ensureCachePartial();
    const index = cache.reviews.findIndex((r) => r.id === id);
    if (index >= 0) {
      cache.reviews[index].approved = true;
      localStorage.setItem(KEYS.REVIEWS, JSON.stringify(cache.reviews));
      syncToSupabase(() => upsertReview(cache.reviews[index]).then());
    }
  },

  deleteReview: (id: string) => {
    const cache = ensureCachePartial();
    cache.reviews = cache.reviews.filter((r) => r.id !== id);
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify(cache.reviews));
    syncToSupabase(() => deleteReviewDb(id).then());
  },

  getUsers: (): User[] => {
    if (memoryCache?.users) {
      const { users: enriched, changed } = enrichUsers(memoryCache.users);
      if (changed) {
        memoryCache.users = enriched;
        localStorage.setItem(KEYS.USERS, JSON.stringify(enriched));
      }
      return enriched;
    }

    const data = localStorage.getItem(KEYS.USERS);
    let users: User[] = [];

    if (!data) {
      users = INITIAL_USERS;
    } else {
      try {
        users = JSON.parse(data);
      } catch (e) {
        console.error('Error parsing users', e);
        users = INITIAL_USERS;
      }
      const existingEmails = new Set(users.map((u: User) => u.email));
      const missingUsers = INITIAL_USERS.filter((u) => !existingEmails.has(u.email));
      if (missingUsers.length > 0) {
        users = [...users, ...missingUsers];
      }
    }

    const { users: enriched, changed } = enrichUsers(users);
    if (changed || !data) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(enriched));
    }

    if (memoryCache) memoryCache.users = enriched;
    return enriched;
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    try {
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error parsing current user', e);
      return null;
    }
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
  },

  updateUser: (user: User) => {
    const cache = ensureCachePartial();
    const index = cache.users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      cache.users[index] = user;
      localStorage.setItem(KEYS.USERS, JSON.stringify(cache.users));
      syncToSupabase(() => upsertUser(user).then());

      const current = storage.getCurrentUser();
      if (current && current.id === user.id) {
        storage.setCurrentUser(user);
      }
    }
  },

  saveUser: (user: User) => {
    const cache = ensureCachePartial();
    const index = cache.users.findIndex((u) => u.id === user.id);
    if (index >= 0) cache.users[index] = user;
    else cache.users.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(cache.users));
    syncToSupabase(() => upsertUser(user).then());
  },

  getConfig: (): HotelConfig => {
    if (memoryCache?.config) return mergeConfigDefaults(memoryCache.config);

    const data = localStorage.getItem(KEYS.CONFIG);
    if (!data) {
      localStorage.setItem(KEYS.CONFIG, JSON.stringify(INITIAL_CONFIG));
      if (memoryCache) memoryCache.config = INITIAL_CONFIG;
      return INITIAL_CONFIG;
    }
    try {
      const config = mergeConfigDefaults(JSON.parse(data));
      if (memoryCache) memoryCache.config = config;
      return config;
    } catch (e) {
      console.error('Error parsing config', e);
      return INITIAL_CONFIG;
    }
  },

  saveConfig: (config: HotelConfig) => {
    const cache = ensureCachePartial();
    cache.config = config;
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(config));
    syncToSupabase(() => upsertConfig(config).then());
  },

  getGallery: (): GalleryImage[] => {
    if (memoryCache?.gallery) return memoryCache.gallery;

    const data = localStorage.getItem(KEYS.GALLERY);
    if (!data) {
      localStorage.setItem(KEYS.GALLERY, JSON.stringify(INITIAL_GALLERY));
      if (memoryCache) memoryCache.gallery = INITIAL_GALLERY;
      return INITIAL_GALLERY;
    }
    try {
      const gallery = JSON.parse(data);
      if (memoryCache) memoryCache.gallery = gallery;
      return gallery;
    } catch (e) {
      console.error('Error parsing gallery', e);
      return INITIAL_GALLERY;
    }
  },

  saveGalleryImage: (image: GalleryImage) => {
    const cache = ensureCachePartial();
    const index = cache.gallery.findIndex((img) => img.id === image.id);
    if (index >= 0) cache.gallery[index] = image;
    else cache.gallery.push(image);
    localStorage.setItem(KEYS.GALLERY, JSON.stringify(cache.gallery));
    syncToSupabase(() => upsertGalleryImage(image).then());
  },

  deleteGalleryImage: (id: string) => {
    const cache = ensureCachePartial();
    cache.gallery = cache.gallery.filter((img) => img.id !== id);
    localStorage.setItem(KEYS.GALLERY, JSON.stringify(cache.gallery));
    syncToSupabase(() => deleteGalleryImageDb(id).then());
  },

  getComplaints: (): Complaint[] => {
    if (memoryCache?.complaints) return memoryCache.complaints;
    const data = localStorage.getItem(KEYS.COMPLAINTS);
    try {
      const complaints = data ? JSON.parse(data) : [];
      if (memoryCache) memoryCache.complaints = complaints;
      return complaints;
    } catch (e) {
      console.error('Error parsing complaints', e);
      return [];
    }
  },

  saveComplaint: (complaint: Complaint) => {
    const cache = ensureCachePartial();
    const index = cache.complaints.findIndex((c) => c.id === complaint.id);
    if (index >= 0) cache.complaints[index] = complaint;
    else cache.complaints.push(complaint);
    localStorage.setItem(KEYS.COMPLAINTS, JSON.stringify(cache.complaints));
    syncToSupabase(() => upsertComplaint(complaint).then());
  },

  deleteComplaint: (id: string) => {
    const cache = ensureCachePartial();
    cache.complaints = cache.complaints.filter((c) => c.id !== id);
    localStorage.setItem(KEYS.COMPLAINTS, JSON.stringify(cache.complaints));
    syncToSupabase(() => deleteComplaintDb(id).then());
  },

  getTenants: (): Tenant[] => {
    if (memoryCache?.tenants) return memoryCache.tenants;

    const data = localStorage.getItem(KEYS.TENANTS);
    if (!data) {
      localStorage.setItem(KEYS.TENANTS, JSON.stringify(INITIAL_TENANTS));
      if (memoryCache) memoryCache.tenants = INITIAL_TENANTS;
      return INITIAL_TENANTS;
    }
    try {
      const tenants = normalizeTenantsList(JSON.parse(data));
      if (memoryCache) memoryCache.tenants = tenants;
      return tenants;
    } catch (e) {
      console.error('Error parsing tenants', e);
      return INITIAL_TENANTS;
    }
  },

  saveTenant: (tenant: Tenant) => {
    const cache = ensureCachePartial();
    const tenantData = mergeTenantDefaults(tenant);
    const index = cache.tenants.findIndex((t) => t.id === tenantData.id);
    if (index >= 0) cache.tenants[index] = tenantData;
    else cache.tenants.push(tenantData);
    localStorage.setItem(KEYS.TENANTS, JSON.stringify(cache.tenants));
    syncToSupabase(() => upsertTenant(tenantData).then());
  },

  deleteTenant: (id: string) => {
    const cache = ensureCachePartial();
    cache.tenants = cache.tenants.filter((t) => t.id !== id);
    localStorage.setItem(KEYS.TENANTS, JSON.stringify(cache.tenants));
    syncToSupabase(() => deleteTenantDb(id).then());
  },

  getTenantInvoices: (): TenantInvoice[] => {
    if (memoryCache?.tenantInvoices) return memoryCache.tenantInvoices;
    const data = localStorage.getItem(KEYS.TENANT_INVOICES);
    try {
      const invoices = data ? JSON.parse(data) : [];
      if (memoryCache) memoryCache.tenantInvoices = invoices;
      return invoices;
    } catch (e) {
      console.error('Error parsing tenant invoices', e);
      return [];
    }
  },

  saveTenantInvoice: (invoice: TenantInvoice) => {
    const cache = ensureCachePartial();
    const index = cache.tenantInvoices.findIndex((i) => i.id === invoice.id);
    if (index >= 0) cache.tenantInvoices[index] = invoice;
    else cache.tenantInvoices.push(invoice);
    localStorage.setItem(KEYS.TENANT_INVOICES, JSON.stringify(cache.tenantInvoices));
    syncToSupabase(() => upsertTenantInvoice(invoice).then());
  },

  deleteTenantInvoice: (id: string) => {
    const cache = ensureCachePartial();
    cache.tenantInvoices = cache.tenantInvoices.filter((i) => i.id !== id);
    localStorage.setItem(KEYS.TENANT_INVOICES, JSON.stringify(cache.tenantInvoices));
    syncToSupabase(() => deleteTenantInvoiceDb(id).then());
  },

  getGlobalConfig: (): GlobalConfig => {
    if (memoryCache?.globalConfig) return mergeGlobalConfigDefaults(memoryCache.globalConfig);

    const data = localStorage.getItem(KEYS.GLOBAL_CONFIG);
    if (!data) {
      localStorage.setItem(KEYS.GLOBAL_CONFIG, JSON.stringify(INITIAL_GLOBAL_CONFIG));
      if (memoryCache) memoryCache.globalConfig = INITIAL_GLOBAL_CONFIG;
      return INITIAL_GLOBAL_CONFIG;
    }
    try {
      const config = mergeGlobalConfigDefaults(JSON.parse(data));
      if (memoryCache) memoryCache.globalConfig = config;
      return config;
    } catch (e) {
      console.error('Error parsing global config', e);
      return INITIAL_GLOBAL_CONFIG;
    }
  },

  getPlatformInvoices: (): Invoice[] => {
    const data = localStorage.getItem(KEYS.PLATFORM_INVOICES);
    try {
      const invoices: Invoice[] = data ? JSON.parse(data) : [];
      return invoices.map(normalizeInvoice);
    } catch (e) {
      console.error('Error parsing platform invoices', e);
      return [];
    }
  },

  savePlatformInvoice: (invoice: Invoice) => {
    const normalized = normalizeInvoice(invoice);
    const invoices = storage.getPlatformInvoices();
    const index = invoices.findIndex(
      (i) => i.id === normalized.id || i.fullNumber === normalized.fullNumber
    );
    if (index >= 0) invoices[index] = normalized;
    else invoices.push(normalized);
    localStorage.setItem(KEYS.PLATFORM_INVOICES, JSON.stringify(invoices));
  },

  saveGlobalConfig: (config: GlobalConfig) => {
    const cache = ensureCachePartial();
    cache.globalConfig = config;
    localStorage.setItem(KEYS.GLOBAL_CONFIG, JSON.stringify(config));
    syncToSupabase(() => upsertGlobalConfig(config).then());
  },

  getActiveTenant: (): Tenant | null => {
    const id = localStorage.getItem('active_tenant_id') || LUMINA_TENANT_ID;
    return storage.getTenants().find((t) => t.id === id) ?? null;
  },

  getActiveTenantPermissions: (): TenantPermissions => {
    const tenant = storage.getActiveTenant();
    const plans = storage.getGlobalConfig().plans;
    if (!tenant) return resolvePlanPermissions('Pro', plans);
    return tenant.permissions ?? resolvePlanPermissions(tenant.plan, plans);
  },

  canAddRoom: (): { ok: boolean; message?: string } => {
    const rooms = storage.getRooms();
    const perms = storage.getActiveTenantPermissions();
    if (rooms.length >= perms.maxRooms) {
      return {
        ok: false,
        message: `Límite del plan alcanzado: máximo ${perms.maxRooms} habitaciones.`,
      };
    }
    return { ok: true };
  },
};
