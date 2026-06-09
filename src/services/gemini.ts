import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async getChatResponse(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
    const rooms = storage.getRooms();
    const config = storage.getConfig();
    
    const systemInstruction = `
      Eres el Concierge Inteligente de Lumina Hotel & Spa. 
      Tu objetivo es ayudar a los huéspedes con información sobre el hotel, recomendaciones de habitaciones y servicios.
      
      Información del Hotel:
      - Nombre: ${config.name}
      - Dirección: ${config.address}
      - Teléfono: ${config.phone}
      - Email: ${config.email}
      
      Habitaciones disponibles:
      ${rooms.map(r => `- **Habitación ${r.number} (${r.name})**: ${r.description}. Precio: **${r.price} por noche**. Capacidad: **${r.capacity} personas**.`).join('\n')}
      
      Servicios:
      - WiFi Alta Velocidad
      - Piscina Climatizada
      - Restaurante Gourmet
      - Spa & Wellness
      - Estacionamiento
      - Aire Acondicionado
      
      Instrucciones de Respuesta:
      1. **Tono**: Siempre amable, profesional, elegante y servicial.
      2. **Estructura**: Organiza la información de forma clara. Usa **negritas** para resaltar datos importantes (precios, nombres de habitaciones).
      3. **Listas**: Cuando recomiendes varias opciones o servicios, usa listas con viñetas.
      4. **Recomendaciones**: Si preguntan por disponibilidad o grupos, recomienda las habitaciones que mejor se adapten.
      5. **Despedida**: Siempre termina con una pregunta abierta o invitando a reservar.
      6. **Brevedad**: Sé conciso pero completo. Evita párrafos largos.
      7. **Markdown**: Utiliza Markdown para mejorar la legibilidad (títulos, listas, negritas).
      
      Ejemplo de estructura para recomendaciones:
      "Para un grupo de [X] personas, le sugiero las siguientes opciones:
      
      * **[Nombre Habitación]**: [Breve descripción]. Precio: **[Precio]**.
      * **[Nombre Habitación]**: [Breve descripción]. Precio: **[Precio]**.
      
      ¿Desea que le ayude con la reserva de alguna de estas opciones?"
    `;

    try {
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: "user", parts: [{ text: systemInstruction }] },
          ...history.map(h => ({ role: h.role, parts: h.parts })),
          { role: "user", parts: [{ text: message }] }
        ],
      });

      const response = await model;
      return response.text;
    } catch (error) {
      console.error("Error calling Gemini:", error);
      return "Lo siento, estoy teniendo dificultades técnicas en este momento. Por favor, intenta de nuevo más tarde o contacta con recepción.";
    }
  }
};
