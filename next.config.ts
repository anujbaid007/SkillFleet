import type { NextConfig } from "next";

// Pin the workspace root to THIS project. A stray package-lock.json in the home
// directory was making Next infer the wrong root, which left the Turbopack dev
// server hot-reloading unreliably and serving stale output. `process.cwd()` is
// the project directory whenever `next dev` / `next build` runs here.
const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },

  experimental: {
    /*
      Every signed-in page is dynamic (it reads the auth cookie), and Next's
      default client cache for dynamic segments is 0 seconds — so returning to
      a page you were just on refetched it from the server every time. Moving
      between Dashboard, Calendar and ISC therefore paid a full render on each
      hop, in both directions.

      Holding those segments briefly makes a revisit instant. The window is
      deliberately short: these pages show carts, bookings and entry status,
      and a stale read there is confusing. Anything that changes data calls
      revalidatePath, which evicts the entry regardless of these times.
    */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
