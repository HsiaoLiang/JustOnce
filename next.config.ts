import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Seed photos are static files; uploads are served by /api/images/[id].
    localPatterns: [{ pathname: "/seed/**" }, { pathname: "/api/images/**" }],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  poweredByHeader: false,
};

export default nextConfig;
