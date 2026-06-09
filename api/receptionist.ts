import { handleReceptionistChat } from "../lib/receptionist-chat.js";

function setCorsHeaders(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
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
    const { message, sessionId, hotelSnapshot, clientHistory, origin } = req.body ?? {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Se requiere message." });
    }
    if (!hotelSnapshot) {
      return res.status(400).json({ error: "Se requiere hotelSnapshot." });
    }

    const result = await handleReceptionistChat({
      message,
      sessionId,
      hotelSnapshot,
      clientHistory,
      origin,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Receptionist error:", error);
    res.status(500).json({ message: error?.message ?? "Error desconocido" });
  }
}
