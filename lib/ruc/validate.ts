export type RucSunatStatus = "activo" | "inactivo" | "no_encontrado";

export interface RucValidationResult {
  valid: boolean;
  ruc: string;
  razonSocial?: string;
  status: RucSunatStatus;
  message: string;
  simulation: boolean;
}

const BLOCKED_RUCS = new Set(["00000000000", "11111111111", "99999999999"]);

function normalizeRuc(raw: string): string {
  return raw.replace(/\D/g, "");
}

function demoRazonSocial(ruc: string): string {
  if (ruc.startsWith("20")) {
    return `Empresa Demo ${ruc.slice(0, 4)} S.A.C.`;
  }
  if (ruc.startsWith("10")) {
    return `Contribuyente Persona Natural ${ruc.slice(-4)}`;
  }
  return `Contribuyente ${ruc}`;
}

export function isRucValidationSimulation(): boolean {
  const mode = (process.env.RUC_VALIDATION || "simulation").toLowerCase();
  return mode !== "production";
}

export function validateRucLocally(rucInput: string): RucValidationResult {
  const simulation = isRucValidationSimulation();
  const ruc = normalizeRuc(rucInput);

  if (ruc.length !== 11) {
    return {
      valid: false,
      ruc,
      status: "no_encontrado",
      message: "El RUC debe tener exactamente 11 dígitos.",
      simulation,
    };
  }

  if (BLOCKED_RUCS.has(ruc)) {
    return {
      valid: false,
      ruc,
      status: "inactivo",
      message: "RUC bloqueado o no habilitado en SUNAT (simulación).",
      simulation,
    };
  }

  if (!ruc.startsWith("10") && !ruc.startsWith("20")) {
    return {
      valid: false,
      ruc,
      status: "no_encontrado",
      message: "RUC no encontrado en el padrón simulado (debe iniciar con 10 o 20).",
      simulation,
    };
  }

  if (ruc.endsWith("00") && ruc.startsWith("20")) {
    return {
      valid: false,
      ruc,
      status: "inactivo",
      message: "Contribuyente con estado INACTIVO en SUNAT (simulación).",
      simulation,
    };
  }

  return {
    valid: true,
    ruc,
    razonSocial: demoRazonSocial(ruc),
    status: "activo",
    message: simulation
      ? "RUC válido (consulta simulada — preparado para API real)."
      : "RUC válido.",
    simulation,
  };
}
