import type { NextConfig } from "next";

// Where the FastAPI backend runs. Set BACKEND_URL on Vercel to the deployed API.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // The browser calls /api/... on the same domain as the website, and Next.js
  // forwards it to the backend. That way we avoid CORS problems entirely.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
