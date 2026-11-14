"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { Search } from "lucide-react";
import type { Bbox, LatLng } from "@/lib/geo";
import { escapeHtml, LONDON_CENTRE, loadLeaflet, TILE_ATTRIBUTION, TILE_URL } from "./leaflet";

export interface MapPin {
  id: string;
  title: string;
  price: string;
  photo?: string;
  area: string;
  lat: number;
  lng: number;
}

/** Search results as price pins. Moving the map offers "Search this area". */
export function ListingMap({ pins, me, onSearchArea, className }: { pins: MapPin[]; me?: LatLng | null; onSearchArea: (box: Bbox) => void; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const meLayer = useRef<Leaflet.LayerGroup | null>(null);
  const programmatic = useRef(false);
  const [moved, setMoved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, { zoomControl: true, scrollWheelZoom: true }).setView(LONDON_CENTRE, 11);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      meLayer.current = L.layerGroup().addTo(m);
      m.on("moveend", () => {
        if (programmatic.current) programmatic.current = false;
        else setMoved(true);
      });
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Redraw pins whenever the results change, and frame them.
  useEffect(() => {
    if (!ready) return;
    loadLeaflet().then((L) => {
      const m = map.current;
      if (!m || !layer.current) return;
      layer.current.clearLayers();
      for (const p of pins) {
        const icon = L.divIcon({ className: "jo-pin-wrap", html: `<span class="jo-pin">${escapeHtml(p.price)}</span>`, iconSize: [64, 30], iconAnchor: [32, 15] });
        const marker = L.marker([p.lat, p.lng], { icon, keyboard: true, title: `${p.title}, ${p.price} per day`, alt: p.title, riseOnHover: true });
        marker.bindPopup(
          `<a class="jo-popup" href="/items/${encodeURIComponent(p.id)}">
            ${p.photo ? `<img src="${escapeHtml(p.photo)}" alt="" />` : ""}
            <span class="jo-popup-title">${escapeHtml(p.title)}</span>
            <span class="jo-popup-meta">${escapeHtml(p.area)} · <strong>${escapeHtml(p.price)}</strong> per day</span>
          </a>`,
          { closeButton: false, maxWidth: 240, minWidth: 220 },
        );
        marker.on("keypress", (e: Leaflet.LeafletKeyboardEvent) => e.originalEvent.key === "Enter" && marker.openPopup());
        layer.current.addLayer(marker);
      }
      if (pins.length) {
        programmatic.current = true;
        m.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 14 });
      }
      setMoved(false);
    });
  }, [pins, ready]);

  useEffect(() => {
    if (!ready) return;
    loadLeaflet().then((L) => {
      meLayer.current?.clearLayers();
      if (me && meLayer.current) {
        L.circleMarker([me.lat, me.lng], { radius: 8, color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip("You").addTo(meLayer.current);
      }
    });
  }, [me, ready]);

  const searchHere = () => {
    const b = map.current?.getBounds();
    if (b) onSearchArea([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
  };

  return (
    <div className={className}>
      <div className="relative h-full overflow-hidden rounded-3xl border border-line bg-surface">
        <div ref={el} className="h-full w-full" role="region" aria-label="Map of results" />
        {moved && (
          <button
            type="button"
            onClick={searchHere}
            className="absolute top-3 left-1/2 z-[500] inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lift"
          >
            <Search className="size-4" aria-hidden /> Search this area
          </button>
        )}
      </div>
    </div>
  );
}
