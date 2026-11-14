"use client";

import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import { loadLeaflet, TILE_ATTRIBUTION, TILE_URL } from "./leaflet";

export interface AreaCircle {
  lat: number;
  lng: number;
  label: string;
}

/**
 * Shaded circles over neighbourhoods (approximate, safe to show anyone), and
 * optionally one exact pin, which callers only pass once a booking is accepted.
 */
export function AreaMap({ circles, pin, radius = 650, className, label }: { circles: AreaCircle[]; pin?: { lat: number; lng: number; label: string } | null; radius?: number; className?: string; label: string }) {
  const el = useRef<HTMLDivElement>(null);
  const key = JSON.stringify({ circles, pin });

  useEffect(() => {
    let map: Leaflet.Map | null = null;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, zoomControl: true });
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(map);
      const points: [number, number][] = [];
      for (const c of circles) {
        L.circle([c.lat, c.lng], { radius, color: "#ff6a1f", weight: 2, fillColor: "#ff6a1f", fillOpacity: 0.18 }).bindTooltip(c.label).addTo(map);
        points.push([c.lat, c.lng]);
      }
      if (pin) {
        L.circleMarker([pin.lat, pin.lng], { radius: 9, color: "#ffffff", weight: 3, fillColor: "#16161d", fillOpacity: 1 })
          .bindTooltip(pin.label, { permanent: true, direction: "top", offset: [0, -8] })
          .addTo(map);
        points.push([pin.lat, pin.lng]);
      }
      if (points.length === 1) map.setView(points[0], pin ? 15 : 14);
      else if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 14 });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [key, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className={className ?? "h-56 w-full overflow-hidden rounded-2xl border border-line bg-surface"} role="img" aria-label={label} />;
}
