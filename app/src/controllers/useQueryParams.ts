import { useState, useCallback } from "react";
import type { Gas } from "@/models/analysis.types";

export function useQueryParams() {
  const [lat, setLat] = useState(-0.9006);
  const [lng, setLng] = useState(36.2894);
  const [radiusKm, setRadiusKm] = useState(10);
  const [gas, setGas] = useState<Gas>("CH4");
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");

  const setCoords = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  }, []);

  return {
    lat, setLat,
    lng, setLng,
    radiusKm, setRadiusKm,
    gas, setGas,
    startDate, setStartDate,
    endDate, setEndDate,
    setCoords,
    params: { lat, lng, radiusKm, gas, startDate, endDate },
  };
}
