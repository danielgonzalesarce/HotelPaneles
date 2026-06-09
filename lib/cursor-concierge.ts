const CURSOR_API_BASE = "https://api.cursor.com/v1";

export interface ConciergeRoomContext {
  number: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
}

export interface ConciergeHotelContext {
  name: string;
  address: string;
  phone: string;
  email: string;
  rooms: ConciergeRoomContext[];
}

export interface ConciergeChatRequest {
  message: string;
  agentId?: string | null;
}

export interface ConciergeChatResponse {
  text: string;
  agentId: string;
}

type RunStatus =
  | "CREATING"
  | "RUNNING"
  | "FINISHED"
  | "ERROR"
  | "CANCELLED"
  | "EXPIRED";

interface CursorRun {
  id: string;
  agentId: string;
  status: RunStatus;
  result?: string;
}

interface CreateAgentResponse {
  agent: { id: string };
  run: { id: string };
}

interface CreateRunResponse {
  run: { id: string };
}

function authHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

export function buildConciergeSystemPrompt(context: ConciergeHotelContext): string {
  const roomsText = context.rooms
    .map(
      (r) =>
        `- **Habitación ${r.number} (${r.name})**: ${r.description}. Precio: **$${r.price} por noche**. Capacidad: **${r.capacity} personas**.`
    )
    .join("\n");

  return `
Eres Lumina, el Concierge Inteligente de ${context.name}.
Tu único rol es atender consultas de huéspedes sobre el hotel.

IMPORTANTE:
- Responde SOLO con texto en español.
- NO uses herramientas, NO modifiques archivos y NO ejecutes comandos.
- NO menciones que eres un agente de código ni hables de repositorios.

Información del Hotel:
- Nombre: ${context.name}
- Dirección: ${context.address}
- Teléfono: ${context.phone}
- Email: ${context.email}

Habitaciones disponibles:
${roomsText}

Servicios:
- WiFi Alta Velocidad
- Piscina Climatizada
- Restaurante Gourmet
- Spa & Wellness
- Estacionamiento
- Aire Acondicionado

Instrucciones de respuesta:
1. Tono amable, profesional, elegante y servicial.
2. Usa **negritas** para precios y nombres de habitaciones.
3. Usa listas cuando recomiendes varias opciones.
4. Recomienda habitaciones según capacidad o preferencias del huésped.
5. Termina invitando a reservar o preguntando si necesita algo más.
6. Sé conciso pero completo. Usa Markdown.
`.trim();
}

async function cursorFetch<T>(
  apiKey: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${CURSOR_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(apiKey),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `Cursor API error (${response.status})`;
    throw new Error(message);
  }

  return body as T;
}

async function waitForRunResult(
  apiKey: string,
  agentId: string,
  runId: string,
  timeoutMs = 120_000
): Promise<string> {
  const startedAt = Date.now();
  let delayMs = 1000;

  while (Date.now() - startedAt < timeoutMs) {
    const run = await cursorFetch<CursorRun>(
      apiKey,
      `/agents/${agentId}/runs/${runId}`
    );

    if (run.status === "FINISHED") {
      return run.result?.trim() || "Lo siento, no pude generar una respuesta.";
    }

    if (run.status === "ERROR" || run.status === "CANCELLED" || run.status === "EXPIRED") {
      throw new Error(`La conversación falló (${run.status}).`);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs * 1.25, 5000);
  }

  throw new Error("Tiempo de espera agotado. El concierge tardó demasiado en responder.");
}

export async function chatWithCursorConcierge(
  apiKey: string,
  context: ConciergeHotelContext,
  request: ConciergeChatRequest
): Promise<ConciergeChatResponse> {
  if (!apiKey.trim()) {
    throw new Error("CURSOR_API_KEY no está configurada.");
  }

  const systemPrompt = buildConciergeSystemPrompt(context);

  if (request.agentId) {
    const { run } = await cursorFetch<CreateRunResponse>(
      apiKey,
      `/agents/${request.agentId}/runs`,
      {
        method: "POST",
        body: JSON.stringify({
          prompt: { text: request.message },
        }),
      }
    );

    const text = await waitForRunResult(apiKey, request.agentId, run.id);
    return { text, agentId: request.agentId };
  }

  const initialPrompt = `${systemPrompt}

---
Responde al huésped:
${request.message}`;

  const { agent, run } = await cursorFetch<CreateAgentResponse>(apiKey, "/agents", {
    method: "POST",
    body: JSON.stringify({
      name: "Lumina Concierge",
      prompt: { text: initialPrompt },
      model: { id: "composer-2.5" },
    }),
  });

  const text = await waitForRunResult(apiKey, agent.id, run.id);
  return { text, agentId: agent.id };
}
