import { useEffect, useRef } from "react";
import { loadLeaflet } from "@/lib/leaflet";

/** Small satellite map with a single pin, e.g. the user's default location. */
export function LocationMap({ lat, lng, zoom = 11, className = "h-52" }: { lat: number; lng: number; zoom?: number; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], zoom);
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Tiles © Esri. Source: Esri, Maxar, Earthstar Geographics", maxZoom: 18 }
      ).addTo(map);
      markerRef.current = L.circleMarker([lat, lng], {
        radius: 7, color: "#fff", fillColor: "#0E7C86", fillOpacity: 1, weight: 2,
      }).addTo(map);
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng]);
  }, [lat, lng]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-[var(--color-border)] ${className}`}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 144 }} />
    </div>
  );
}
