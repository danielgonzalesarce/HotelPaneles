import { format, parseISO, subMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Reservation, Room } from '../types';

export function buildMonthlyReservationTrend(reservations: Reservation[], months = 6) {
  const anchors = Array.from({ length: months }, (_, i) =>
    startOfMonth(subMonths(new Date(), months - 1 - i))
  );

  const labels = anchors.map((d) => format(d, 'MMM yy', { locale: es }));
  const data = anchors.map((anchor) =>
    reservations.filter((r) => {
      if (!r.checkIn) return false;
      try {
        const d = parseISO(r.checkIn);
        return (
          d.getMonth() === anchor.getMonth() &&
          d.getFullYear() === anchor.getFullYear() &&
          r.status !== 'cancelled'
        );
      } catch {
        return false;
      }
    }).length
  );

  return { labels, data };
}

export function buildRoomTypeDistribution(rooms: Room[]) {
  const types = [...new Set(rooms.map((r) => r.type))];
  return {
    labels: types,
    data: types.map((t) => rooms.filter((r) => r.type === t).length),
  };
}

export function buildMonthlyIncome(reservations: Reservation[]) {
  const acc: Record<string, number> = {};
  reservations.forEach((res) => {
    if (res.status === 'cancelled' || !res.checkIn) return;
    try {
      const date = parseISO(res.checkIn);
      if (Number.isNaN(date.getTime())) return;
      const key = format(date, 'MMM yy', { locale: es });
      acc[key] = (acc[key] || 0) + Number(res.totalPrice || 0);
    } catch {
      /* ignore invalid dates */
    }
  });
  return acc;
}
