// Leaflet touches `window`, so it's only ever loaded in the browser, on demand.
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";

let loading: Promise<typeof Leaflet> | null = null;

export function loadLeaflet(): Promise<typeof Leaflet> {
  loading ??= import("leaflet").then((m) => (m.default ?? m) as typeof Leaflet);
  return loading;
}

// OpenStreetMap tiles need no API key. Fine for a demo; use a tile provider with a usage plan beyond that.
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const LONDON_CENTRE: [number, number] = [51.509, -0.118];

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
