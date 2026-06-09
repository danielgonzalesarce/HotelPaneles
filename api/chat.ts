import {
  chatWithCursorConcierge,
  type ConciergeHotelContext,
} from "../lib/cursor-concierge.js";

function setCorsHeaders(res: {
  setHeader: (name: string, value: string) => void;
}) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const apiKey = process.env.CURSOR_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "Servicio no configurado",
        message: "CURSOR_API_KEY no está definida.",
      });
    }

    const { message, agentId, context } = req.body ?? {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Se requiere el campo message." });
    }

    if (!context || typeof context !== "object") {
      return res.status(400).json({ error: "Se requiere el contexto del hotel." });
    }

    const hotelContext = context as ConciergeHotelContext;

    if (
      !hotelContext.name ||
      !Array.isArray(hotelContext.rooms) ||
      hotelContext.rooms.length === 0
    ) {
      return res.status(400).json({ error: "Contexto del hotel incompleto." });
    }

    const result = await chatWithCursorConcierge(apiKey, hotelContext, {
      message: message.trim(),
      agentId: typeof agentId === "string" ? agentId : null,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in concierge chat:", error);
    res.status(500).json({
      error: "Error al procesar la consulta",
      message: error?.message ?? "Error desconocido",
    });
  }
}
