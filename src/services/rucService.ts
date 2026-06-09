export interface RucValidationResponse {
  valid: boolean;
  ruc: string;
  razonSocial?: string;
  status: "activo" | "inactivo" | "no_encontrado";
  message: string;
  simulation: boolean;
}

export async function validateRuc(ruc: string): Promise<RucValidationResponse> {
  const response = await fetch("/api/ruc/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ruc }),
  });

  const data = await response.json();
  if (response.ok || response.status === 422) {
    return data;
  }
  throw new Error(data.message || data.error || "Error al validar RUC");
}
