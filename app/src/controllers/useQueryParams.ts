import { useState, useCallback } from "react";
import type { Gas } from "@/models/analysis.types";
import { useAuth } from "@/controllers/useAuth";

// Used when the user has not saved a default location yet (Nairobi).
const FALLBACK = { latitude: -1.2921, longitude: 36.8219 };

const PREFS_KEY = "gaswatch:ann-prefs";
function readPrefs(): { gas?: Gas; radiusKm?: number } {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function writePrefs(p: { gas?: Gas; radiusKm?: number }) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...p }));
  } catch {
    /* ignore */
  }
}

export interface AnnPrefill {
  source: "satellite" | "upload";
  gas: Gas;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  startDate?: string;
  endDate?: string;
  label?: string;
}

export function useQueryParams(prefill?: AnnPrefill | null) {
  const { user } = useAuth();
  const home = user?.defaultLocation ?? null;

  const [lat, setLat] = useState(prefill?.lat ?? home?.latitude ?? FALLBACK.latitude);
  const [lng, setLng] = useState(prefill?.lng ?? home?.longitude ?? FALLBACK.longitude);
  const saved = readPrefs();
  const [radiusKm, setRadiusKmRaw] = useState(prefill?.radiusKm ?? saved.radiusKm ?? 10);
  const [gas, setGasRaw] = useState<Gas>(prefill?.gas ?? saved.gas ?? "CO2");
  const setRadiusKm = useCallback((v: number) => { setRadiusKmRaw(v); writePrefs({ radiusKm: v }); }, []);
  const setGas = useCallback((g: Gas) => { setGasRaw(g); writePrefs({ gas: g }); }, []);
  const [startDate, setStartDate] = useState(prefill?.startDate ?? "2024-01-01");
  const [endDate, setEndDate] = useState(prefill?.endDate ?? "2024-12-31");

  const setCoords = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  }, []);

  const useHome = useCallback(() => {
    if (home) {
      setLat(home.latitude);
      setLng(home.longitude);
    }
  }, [home]);

  return {
    lat, setLat,
    lng, setLng,
    radiusKm, setRadiusKm,
    gas, setGas,
    startDate, setStartDate,
    endDate, setEndDate,
    setCoords,
    hasHome: home !== null,
    useHome,
    params: { lat, lng, radiusKm, gas, startDate, endDate },
  };
}
