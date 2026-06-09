export interface CheckoutSessionParams {
  roomName: string;
  roomId: string;
  price: number;
  totalPrice: number;
  reservationId: string;
  source?: 'chat' | 'web';
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
}

export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<{ url: string; simulated?: boolean }> {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) {
    throw new Error(data.error || data.message || 'No se pudo iniciar el pago con Stripe.');
  }

  return { url: data.url, simulated: data.simulated };
}
