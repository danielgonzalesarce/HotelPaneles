import { describe, it, expect } from 'vitest';
import { stripBookingBlock } from '../../lib/receptionist-booking.js';

describe('receptionist-booking', () => {
  it('extrae intent de reserva del bloque oculto', () => {
    const raw =
      'Perfecto, todo listo.\n[RESERVA_LISTA]{"guestName":"Ana López","roomType":"Suite Premium","checkIn":"2026-07-01","checkOut":"2026-07-03","guests":2}[/RESERVA_LISTA]';
    const { cleanText, intent } = stripBookingBlock(raw);
    expect(cleanText).toBe('Perfecto, todo listo.');
    expect(intent?.guestName).toBe('Ana López');
    expect(intent?.checkIn).toBe('2026-07-01');
  });
});
