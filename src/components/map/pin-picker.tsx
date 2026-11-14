"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { getArea } from "@/lib/areas";
import { LONDON_CENTRE, loadLeaflet, TILE_ATTRIBUTION, TILE_URL } from "./leaflet";

/** Owner-only: tap the map to set the exact pickup point. Renters see it only after acceptance. */
export function PinPicker({ area, initial }: { area: string; initial: { lat: number; lng: number } | null }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const [pin, setPin] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current || map.current) return;
      const centre = initial ?? getArea(area) ?? null;
      const m = L.map(el.current, { scrollWheelZoom: false }).setView(centre ? [centre.lat, centre.lng] : LONDON_CENTRE, centre ? 15 : 11);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(m);
      const icon = L.divIcon({ className: "jo-pin-wrap", html: '<span class="jo-pin jo-pin-dot" aria-hidden="true"></span>', iconSize: [22, 22], iconAnchor: [11, 11] });
      const place = (lat: number, lng: number) => {
        const p = { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 };
        if (marker.current) marker.current.setLatLng([p.lat, p.lng]);
        else {
          marker.current = L.marker([p.lat, p.lng], { icon, draggable: true, keyboard: true, title: "Pickup point" }).addTo(m);
          marker.current.on("dragend", () => {
            const ll = marker.current!.getLatLng();
            setPin({ lat: Math.round(ll.lat * 1e5) / 1e5, lng: Math.round(ll.lng * 1e5) / 1e5 });
          });
        }
        setPin(p);
      };
      if (initial) place(initial.lat, initial.lng);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => place(e.latlng.lat, e.latlng.lng));
      map.current = m;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the chosen neighbourhood until a pin is set.
  useEffect(() => {
    const a = getArea(area);
    if (a && !pin) map.current?.setView([a.lat, a.lng], 15);
  }, [area]); // eslint-disable-line react-hooks/exhaustive-deps

  const clear = () => {
    marker.current?.remove();
    marker.current = null;
    setPin(null);
  };

  return (
    <div>
      <input type="hidden" name="pickupLat" value={pin?.lat ?? ""} />
      <input type="hidden" name="pickupLng" value={pin?.lng ?? ""} />
      <div ref={el} className="h-56 w-full overflow-hidden rounded-2xl border border-line bg-surface" role="application" aria-label="Map: tap to set the exact pickup point" />
      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted">{pin ? `Pin set at ${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}. Drag it to adjust.` : "Tap the map to drop a pin (optional)."}</span>
        {pin && (
          <button type="button" onClick={clear} className="font-semibold underline underline-offset-4">
            Remove pin
          </button>
        )}
      </div>
    </div>
  );
}
