/** true = simulación académica local, sin envío real a NubeFact/SUNAT */
export function isSunatSimulation(): boolean {
  const flag = process.env.SUNAT_SIMULATION?.toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  if (flag === "false" || flag === "0" || flag === "no") return false;
  return (process.env.SUNAT_PROVIDER || "demo").toLowerCase() === "demo";
}

export function resolveSunatProvider(): "demo" | "nubefact" {
  if (isSunatSimulation()) return "demo";
  const provider = (process.env.SUNAT_PROVIDER || "demo").toLowerCase();
  return provider === "nubefact" ? "nubefact" : "demo";
}
