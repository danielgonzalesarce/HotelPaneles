import { GoogleGenAI } from "@google/genai";
import type {
  ChatMessage,
  HotelSnapshot,
  KnowledgeEntry,
  ReceptionistChatResult,
} from "./receptionist-types.js";
import { buildReceptionistSystemPrompt } from "./receptionist-prompt.js";
import {
  ensureSession,
  loadSessionMessages,
  saveMessage,
  loadKnowledge,
  saveKnowledgeEntries,
} from "./receptionist-db.js";
import { stripBookingBlock, buildBookingFromIntent } from "./receptionist-booking.js";
import { generateFallbackReply } from "./receptionist-fallback.js";
import { tryFallbackBookingReply } from "./receptionist-booking-parse.js";
import { answerDateAvailabilityQuery, answerRoomQuery, isInventoryListRequest, isRoomInventoryQuery } from "./receptionist-rooms.js";

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
].filter(Boolean) as string[];

function isQuotaError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error);
  const status = (error as { status?: number })?.status;
  return status === 429 || /429|quota|RESOURCE_EXHAUSTED|rate.?limit/i.test(msg);
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  for (const model of [...new Set(GEMINI_MODELS)]) {
    try {
      const contents = [
        { role: "user", parts: [{ text: systemPrompt }] },
        {
          role: "model",
          parts: [
            {
              text: "Entendido. Soy Valentina, recepcionista de Lumina. Responderé como persona real usando los datos del hotel.",
            },
          ],
        },
        ...history.slice(-16).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: userMessage.trim() }] },
      ];

      const response = await ai.models.generateContent({ model, contents });
      const text = response.text?.trim();
      if (text) return text;
    } catch (error) {
      lastError = error;
      if (!isQuotaError(error) && !shouldUseFallback(error)) throw error;
    }
  }

  throw lastError ?? new Error("Gemini no disponible");
}

function shouldUseFallback(error: unknown): boolean {
  if (isQuotaError(error)) return true;
  const msg = String((error as { message?: string })?.message ?? error);
  return /404|NOT_FOUND|503|500|fetch failed|network/i.test(msg);
}

async function extractKnowledgeFromExchange(
  apiKey: string,
  userMessage: string,
  assistantReply: string,
  hotelName: string
): Promise<KnowledgeEntry[]> {
  if (process.env.DISABLE_KNOWLEDGE_EXTRACTION === "true") return [];
  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = GEMINI_MODELS[0] || "gemini-2.0-flash-lite";
    const prompt = `Si hay un dato NUEVO y permanente del hotel en este chat, devuelve JSON [{"topic":"...","content":"..."}] si no []. Solo JSON.
Huésped: ${userMessage}
Recepcionista: ${assistantReply}`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const raw = response.text?.trim().replace(/```json|```/g, "") ?? "[]";
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e?.topic && e?.content)
      .slice(0, 2)
      .map((e) => ({
        topic: String(e.topic).slice(0, 120),
        content: String(e.content).slice(0, 500),
        source: "conversation",
      }));
  } catch {
    return [];
  }
}

async function resolveCheckoutUrl(
  checkoutParams: Record<string, string | number>,
  origin: string
): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  const params = new URLSearchParams();
  Object.entries(checkoutParams).forEach(([k, v]) => {
    if (k !== "origin") params.set(k, String(v));
  });

  if (!key || key.includes("TODO")) {
    return `${origin}/checkout-simulado?${params.toString()}`;
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(key);
  const { roomName, price, totalPrice, reservationId, guestName, source } = checkoutParams;

  const successUrl =
    source === "chat"
      ? `${origin}/?chat=open&chatPaymentSuccess=true&reservationId=${reservationId}&roomName=${encodeURIComponent(String(roomName))}&guestName=${encodeURIComponent(String(guestName))}`
      : `${origin}/reserva?success=true&reservationId=${reservationId}`;

  const cancelUrl =
    source === "chat"
      ? `${origin}/?chat=open&chatPaymentCanceled=true&reservationId=${reservationId}`
      : `${origin}/reserva?canceled=true&reservationId=${reservationId}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Adelanto 10% - ${roomName}`,
            description: `Reserva ${reservationId}`,
          },
          unit_amount: Math.round(Number(price) * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      reservationId: String(reservationId),
      source: String(source ?? "chat"),
    },
  });

  return session.url ?? `${origin}/checkout-simulado?${params.toString()}`;
}

export async function handleReceptionistChat(input: {
  message: string;
  sessionId?: string;
  hotelSnapshot: HotelSnapshot;
  clientHistory?: ChatMessage[];
  origin?: string;
}): Promise<ReceptionistChatResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const sessionId = await ensureSession(input.sessionId);
  const dbHistory = await loadSessionMessages(sessionId);
  const history =
    dbHistory.length > 0 ? dbHistory : (input.clientHistory ?? []).slice(-20);

  const knowledge = await loadKnowledge();
  const systemPrompt = buildReceptionistSystemPrompt(input.hotelSnapshot, knowledge);

  let rawReply: string;
  let usedFallback = false;

  if (isRoomInventoryQuery(input.message) && isInventoryListRequest(input.message)) {
    const listed = answerRoomQuery(input.message, input.hotelSnapshot, history);
    if (listed) {
      rawReply = listed;
      usedFallback = true;
    }
  }

  if (!usedFallback) {
    const structuredBooking = tryFallbackBookingReply(
      input.message,
      input.hotelSnapshot,
      history
    );
    const dateAvailability = answerDateAvailabilityQuery(
      input.message,
      input.hotelSnapshot,
      history
    );

    if (structuredBooking) {
      rawReply = structuredBooking;
      usedFallback = true;
    } else if (dateAvailability) {
      rawReply = dateAvailability;
      usedFallback = true;
    } else if (apiKey) {
      try {
        rawReply = await callGemini(apiKey, systemPrompt, history, input.message);
      } catch (error) {
        rawReply = generateFallbackReply(input.message, input.hotelSnapshot, knowledge, history);
        usedFallback = true;
      }
    } else {
      rawReply = generateFallbackReply(input.message, input.hotelSnapshot, knowledge, history);
      usedFallback = true;
    }
  }

  const { cleanText, intent } = stripBookingBlock(rawReply!);

  let text = cleanText;
  let booking: ReceptionistChatResult["booking"];

  if (intent) {
    const built = buildBookingFromIntent(
      intent,
      input.hotelSnapshot,
      input.origin ?? "http://localhost:3000"
    );
    if (built?.error) {
      text = `${cleanText}\n\n${built.error} ¿Desea revisar fechas u otra habitación?`;
    } else if (built) {
      const checkoutUrl = await resolveCheckoutUrl(
        built.checkoutParams,
        input.origin ?? "http://localhost:3000"
      );
      booking = {
        reservationId: String(built.checkoutParams.reservationId),
        checkoutUrl,
        roomName: String(built.checkoutParams.roomName),
        deposit: Number(built.checkoutParams.price),
        totalPrice: Number(built.checkoutParams.totalPrice),
        reservation: built.reservation,
      };

      text = `${cleanText}\n\nLe dejo listo el **adelanto del 10%** para confirmar y apartar la habitación:\n\n👉 [Pagar adelanto con Stripe](${checkoutUrl})`;
    }
  }

  await saveMessage(sessionId, "user", input.message.trim());
  await saveMessage(sessionId, "assistant", text);

  let newKnowledge: KnowledgeEntry[] | undefined;
  if (apiKey && !usedFallback) {
    const extracted = await extractKnowledgeFromExchange(
      apiKey,
      input.message,
      text,
      input.hotelSnapshot.config.name
    );
    if (extracted.length > 0) {
      await saveKnowledgeEntries(extracted, sessionId);
      newKnowledge = extracted;
    }
  }

  return {
    text,
    sessionId,
    booking,
    newKnowledge,
  };
}
