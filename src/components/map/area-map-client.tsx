"use client";

import dynamic from "next/dynamic";

/** AreaMap, rendered only in the browser (Leaflet needs `window`). */
export const AreaMapClient = dynamic(() => import("./area-map").then((m) => m.AreaMap), {
  ssr: false,
  loading: () => <div className="h-56 w-full animate-pulse rounded-2xl bg-surface" />,
});
