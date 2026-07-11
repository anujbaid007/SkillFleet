import type { NextConfig } from "next";

// Pin the workspace root to THIS project. A stray package-lock.json in the home
// directory was making Next infer the wrong root, which left the Turbopack dev
// server hot-reloading unreliably and serving stale output. `process.cwd()` is
// the project directory whenever `next dev` / `next build` runs here.
const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
