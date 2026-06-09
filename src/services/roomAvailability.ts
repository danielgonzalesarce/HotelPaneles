import { parseISO, isValid, format } from 'date-fns';
import { storage } from './storage';
import { RoomStatus, type Reservation } from '../types';

export function datesOverlap(
  checkInA: string,
  checkOutA: string,
  checkInB: string,
  checkOutB: string
): boolean {
  const aIn = parseISO(checkInA);
  const aOut = parseISO(checkOutA);
  const bIn = parseISO(checkInB);
  const bOut = parseISO(checkOutB);
  if (!isValid(aIn) || !isValid(aOut) || !isValid(bIn) || !isValid(bOut)) return false;
  return aIn < bOut && bIn < aOut;
}

export function getBlockingReservations(): Reservation[] {
  return storage
    .getReservations()
    .filter((r) => r.status === 'confirmed' || r.status === 'pending_payment');
}

export function isRoomAvailableForDates(
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): boolean {
  const checkInDate = parseISO(checkIn);
  const checkOutDate = parseISO(checkOut);
  if (!isValid(checkInDate) || !isValid(checkOutDate) || checkOutDate <= checkInDate) {
    return false;
  }

  return !getBlockingReservations().some(
    (r) =>
      r.roomId === roomId &&
      r.id !== excludeReservationId &&
      datesOverlap(checkIn, checkOut, r.checkIn, r.checkOut)
  );
}

export function getUnavailableRoomIds(checkIn: string, checkOut: string): string[] {
  const ids = new Set<string>();
  getBlockingReservations().forEach((r) => {
    if (datesOverlap(checkIn, checkOut, r.checkIn, r.checkOut)) {
      ids.add(r.roomId);
    }
  });
  return [...ids];
}

export function syncRoomStatusForRoom(roomId: string): void {
  const today = format(new Date(), 'yyyy-MM-dd');
  const active = getBlockingReservations().filter(
    (r) => r.roomId === roomId && parseISO(r.checkOut) >= parseISO(today)
  );

  if (active.length > 0) {
    storage.updateRoomStatus(roomId, RoomStatus.Reserved);
  } else {
    storage.updateRoomStatus(roomId, RoomStatus.Available);
  }
}

export function markRoomAsReserved(roomId: string): void {
  storage.updateRoomStatus(roomId, RoomStatus.Reserved);
}

export function confirmReservationAndBlockRoom(reservationId: string): boolean {
  const reservation = storage.getReservations().find((r) => r.id === reservationId);
  if (!reservation) return false;

  storage.updateReservationStatus(reservationId, 'confirmed');
  markRoomAsReserved(reservation.roomId);
  return true;
}

export function cancelReservationAndReleaseRoom(reservationId: string): void {
  const reservation = storage.getReservations().find((r) => r.id === reservationId);
  if (!reservation) return;

  storage.updateReservationStatus(reservationId, 'cancelled');
  syncRoomStatusForRoom(reservation.roomId);
}
