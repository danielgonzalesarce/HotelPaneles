import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();
import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import Stripe from "stripe";
import { handleReceptionistChat } from "./lib/receptionist-chat.js";
import { emitElectronicDocument, validateElectronicInvoice } from "./lib/sunat/emit.js";
import type { ElectronicInvoicePayload } from "./lib/sunat/types.js";
import { isSunatSimulation, resolveSunatProvider } from "./lib/sunat/config.js";
import { validateRucLocally } from "./lib/ruc/validate.js";

const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.npm_lifecycle_event === "start";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  let stripeClient: Stripe | null = null;

  function getStripe(): Stripe {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required');
      }
      stripeClient = new Stripe(key);
    }
    return stripeClient;
  }

  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL?.trim();

  // API routes
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      receptionist: true,
      gemini: Boolean(process.env.GEMINI_API_KEY),
      n8n: Boolean(n8nWebhookUrl),
    });
  });

  /** Chat web → n8n → /api/receptionist/chat (evita CORS y no crea bucle con n8n) */
  if (n8nWebhookUrl) {
    app.post("/api/n8n/receptionist", async (req, res) => {
      try {
        const upstream = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body ?? {}),
        });
        const data = await upstream.json().catch(() => ({}));
        if (!upstream.ok) {
          return res.status(upstream.status).json(data);
        }
        res.json(data);
      } catch (error: any) {
        console.error("Error proxy n8n:", error);
        res.status(502).json({
          error: "n8n no disponible",
          message:
            "Verifique que Docker y n8n estén activos (http://localhost:5678) y el workflow Valentina publicado.",
        });
      }
    });
  }

  app.post("/api/receptionist/chat", async (req, res) => {
    try {
      const { message, sessionId, hotelSnapshot, clientHistory, origin } = req.body ?? {};

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Se requiere el campo message." });
      }
      if (!hotelSnapshot || typeof hotelSnapshot !== "object") {
        return res.status(400).json({ error: "Se requiere hotelSnapshot." });
      }

      const result = await handleReceptionistChat({
        message,
        sessionId,
        hotelSnapshot,
        clientHistory,
        origin,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error in receptionist chat:", error);
      res.status(error.message?.includes("GEMINI") ? 503 : 500).json({
        error: "Error al procesar la consulta",
        message: error?.message ?? "Error desconocido",
      });
    }
  });

  /** Compatibilidad con clientes antiguos del concierge */
  app.post("/api/concierge", async (req, res) => {
    try {
      const { message, sessionId, context, history, origin, hotelSnapshot } = req.body ?? {};
      if (!message) return res.status(400).json({ error: "Se requiere message." });

      const snapshot =
        hotelSnapshot ??
        (context
          ? {
              config: {
                name: context.name,
                address: context.address,
                phone: context.phone,
                email: context.email,
                whatsapp: context.whatsapp,
              },
              rooms: context.rooms ?? [],
              reservations: context.reservations ?? [],
              reviews: context.reviews ?? [],
              gallery: context.gallery ?? [],
            }
          : null);

      if (!snapshot) return res.status(400).json({ error: "Contexto requerido." });

      const result = await handleReceptionistChat({
        message,
        sessionId,
        hotelSnapshot: snapshot,
        clientHistory: (history ?? []).map((h: { role: string; text: string }) => ({
          role: h.role === "model" ? "assistant" : "user",
          content: h.text,
        })),
        origin,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error?.message });
    }
  });

  app.post("/api/ruc/validate", (req, res) => {
    try {
      const { ruc } = req.body ?? {};
      if (!ruc || typeof ruc !== "string") {
        return res.status(400).json({ error: "Se requiere el campo ruc." });
      }
      const result = validateRucLocally(ruc);
      if (!result.valid) {
        return res.status(422).json(result);
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        error: "Error al validar RUC",
        message: error?.message ?? "Error desconocido",
      });
    }
  });

  app.get("/api/sunat/status", (_req, res) => {
    const simulation = isSunatSimulation();
    const provider = resolveSunatProvider();
    const configured =
      simulation ||
      (provider === "nubefact" &&
        Boolean(process.env.NUBEFACT_TOKEN && process.env.NUBEFACT_API_URL));
    res.json({
      provider,
      simulation,
      configured,
      ruc: process.env.SUNAT_RUC || undefined,
      label: simulation
        ? "Simulación académica (sin envío a SUNAT)"
        : "Producción vía NubeFact",
    });
  });

  app.post("/api/sunat/emit", async (req, res) => {
    try {
      const { invoice } = req.body ?? {};
      if (!invoice || typeof invoice !== "object") {
        return res.status(400).json({ error: "Se requiere el campo invoice." });
      }

      const payload = invoice as ElectronicInvoicePayload;
      const simulation = isSunatSimulation();
      const issues = validateElectronicInvoice(payload, { simulation });
      if (issues.length > 0) {
        return res.status(422).json({
          success: false,
          status: "rechazado",
          message: issues.map((i) => i.message).join(" "),
          validationErrors: issues.map((i) => i.message),
          provider: resolveSunatProvider(),
        });
      }

      const result = await emitElectronicDocument(payload);
      if (!result.success) {
        return res.status(422).json(result);
      }
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error SUNAT emit:", error);
      res.status(500).json({ error: "Error al emitir comprobante", message });
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
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

      const baseUrl = origin || process.env.APP_URL || "http://localhost:3000";
      const key = process.env.STRIPE_SECRET_KEY;

      const checkoutParams = new URLSearchParams({
        roomName: String(roomName),
        price: String(price),
        totalPrice: String(totalPrice ?? price),
        reservationId: String(reservationId),
      });
      if (roomId) checkoutParams.set("roomId", String(roomId));
      if (source) checkoutParams.set("source", String(source));
      if (guestName) checkoutParams.set("guestName", String(guestName));
      if (checkIn) checkoutParams.set("checkIn", String(checkIn));
      if (checkOut) checkoutParams.set("checkOut", String(checkOut));

      if (!key || key === "" || key.includes("TODO")) {
        console.warn("STRIPE_SECRET_KEY not found or invalid. Using local simulated checkout.");
        return res.json({
          url: `${baseUrl}/checkout-simulado?${checkoutParams.toString()}`,
          simulated: true,
        });
      }

      const stripe = getStripe();

      const successUrl =
        source === "chat"
          ? `${baseUrl}/?chat=open&chatPaymentSuccess=true&reservationId=${reservationId}&roomName=${encodeURIComponent(roomName)}&guestName=${encodeURIComponent(guestName || "Huésped")}`
          : `${baseUrl}/reserva?success=true&session_id={CHECKOUT_SESSION_ID}&reservationId=${reservationId}&roomId=${roomId || ""}`;

      const cancelUrl =
        source === "chat"
          ? `${baseUrl}/?chat=open&chatPaymentCanceled=true&reservationId=${reservationId}`
          : `${baseUrl}/reserva?canceled=true&reservationId=${reservationId}&roomId=${roomId || ""}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Adelanto 10% - Reserva: ${roomName}`,
                description: `ID: ${reservationId} | Total: $${Number(totalPrice ?? price).toFixed(2)} | Saldo pendiente en hotel: $${(Number(totalPrice ?? price) - Number(price)).toFixed(2)}`,
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
          totalPrice: String(totalPrice ?? price),
          depositPaid: String(price),
          source: source || "web",
          roomId: roomId || "",
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({
        error: "Error al crear la sesión de pago",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  });

  // Vite middleware for development
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false, maxAge: "1d" }));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} (${isProduction ? "production" : "development"})`);
    console.log(`Receptionist API: POST http://localhost:${PORT}/api/receptionist/chat`);
    if (n8nWebhookUrl) {
      console.log(`Chat web (n8n): POST http://localhost:${PORT}/api/n8n/receptionist → ${n8nWebhookUrl}`);
    }
  });
}

startServer();
