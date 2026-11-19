import type { NextConfig } from "next";

// A static, backend-free build of Just Once for GitHub Pages.
// GitHub Pages serves a project site under /<repo-name>, so the build reads that from DEMO_BASE_PATH.
const basePath = process.env.DEMO_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: {
    // Static hosting has no image optimiser; the loader just adds the base path.
    loader: "custom",
    loaderFile: "./image-loader.ts",
  },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  poweredByHeader: false,
};

export default nextConfig;
