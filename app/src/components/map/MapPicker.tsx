import { useEffect, useRef } from "react";
import { loadLeaflet } from "@/lib/leaflet";

interface MapPickerProps {
  lat: number;
  lng: number;
  radiusKm: number;
  onChange: (lat: number, lng: number) => void;
}

export default function MapPicker({
  lat,
  lng,
  radiusKm,
  onChange,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Bootstrap map once
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 8,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      const circle = L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: "#0E7C86",
        fillColor: "#0E7C86",
        fillOpacity: 0.12,
        weight: 1.5,
      }).addTo(map);

      const update = (latlng: { lat: number; lng: number }) => {
        marker.setLatLng(latlng);
        circle.setLatLng(latlng);
        onChangeRef.current(
          parseFloat(latlng.lat.toFixed(4)),
          parseFloat(latlng.lng.toFixed(4))
        );
      };

      marker.on("dragend", () => update(marker.getLatLng()));
      map.on("click", (e: any) => update(e.latlng));

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync pin when lat/lng change from inputs
  useEffect(() => {
    if (!markerRef.current || !circleRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    const latlng = L.latLng(lat, lng);
    markerRef.current.setLatLng(latlng);
    circleRef.current.setLatLng(latlng);
  }, [lat, lng]);

  // Sync circle radius
  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.setRadius(radiusKm * 1000);
  }, [radiusKm]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: 144 }}
    />
  );
}
