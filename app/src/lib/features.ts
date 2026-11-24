import type { Gas } from "@/models/analysis.types";

/**
 * Feature switches for the ANN analysis. For now the ANN works from files the
 * user uploads, for CO₂ only. Flip these as the satellite pipeline and the
 * other gases' notebooks are integrated - nothing else needs to change.
 */
export const SATELLITE_ENABLED = false;
export const ENABLED_GASES: Gas[] = ["CO2"];
export const isGasEnabled = (g: Gas) => ENABLED_GASES.includes(g);
