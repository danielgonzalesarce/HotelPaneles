/**
 * @deprecated El motor de reservas por reglas fue reemplazado por lib/receptionist-chat.ts (IA).
 * Este archivo se mantiene solo para evitar errores en pestañas o imports antiguos.
 */
export type ConciergeSession = { bookingStep: 'idle' | 'collecting' };

export async function tryBookingFlow(): Promise<null> {
  return null;
}

export function processConciergeMessage(): { text: string; session: ConciergeSession } {
  return {
    text: 'Use el chat de recepción (receptionistService).',
    session: { bookingStep: 'idle' },
  };
}
