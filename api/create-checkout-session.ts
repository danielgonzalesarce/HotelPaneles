import Stripe from "stripe";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      roomName,
      price,
      totalPrice,
      reservationId,
      origin,
      roomId,
      source,
      guestName,
      checkIn,
      checkOut,
    } = req.body;
    
    if (!roomName || !price || !reservationId) {
      return res.status(400).json({ error: "Faltan datos requeridos (roomName, price, reservationId)" });
    }

    const baseUrl = origin || process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const key = process.env.STRIPE_SECRET_KEY;

    const checkoutParams = new URLSearchParams({
      roomName,
      price: String(price),
      totalPrice: String(totalPrice ?? price),
      reservationId,
    });
    if (roomId) checkoutParams.set('roomId', roomId);
    if (source) checkoutParams.set('source', source);
    if (guestName) checkoutParams.set('guestName', guestName);
    if (checkIn) checkoutParams.set('checkIn', checkIn);
    if (checkOut) checkoutParams.set('checkOut', checkOut);
    
    if (!key || key === "" || key.includes("TODO")) {
      console.warn("STRIPE_SECRET_KEY not found or invalid. Using local simulated checkout.");
      return res.json({ 
        url: `${baseUrl}/checkout-simulado?${checkoutParams.toString()}`,
        simulated: true 
      });
    }

    const stripe = new Stripe(key);

    const successUrl =
      source === 'chat'
        ? `${baseUrl}/?chat=open&chatPaymentSuccess=true&reservationId=${reservationId}&roomName=${encodeURIComponent(roomName)}&guestName=${encodeURIComponent(guestName || 'Huésped')}`
        : `${baseUrl}/reserva?success=true&session_id={CHECKOUT_SESSION_ID}&reservationId=${reservationId}&roomId=${roomId || ''}`;

    const cancelUrl =
      source === 'chat'
        ? `${baseUrl}/?chat=open&chatPaymentCanceled=true&reservationId=${reservationId}`
        : `${baseUrl}/reserva?canceled=true&reservationId=${reservationId}&roomId=${roomId || ''}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Adelanto 10% - Reserva: ${roomName}`,
              description: `ID: ${reservationId} | Total: $${totalPrice.toFixed(2)} | Saldo pendiente a pagar en hotel: $${(totalPrice - price).toFixed(2)}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        reservationId: reservationId,
        totalPrice: String(totalPrice ?? price),
        depositPaid: String(price),
        source: source || 'web',
      }
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ 
      error: "Error al crear la sesión de pago", 
      message: error.message
    });
  }
}
