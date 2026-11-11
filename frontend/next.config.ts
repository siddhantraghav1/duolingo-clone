import type { NextConfig } from "next";

// Where the FastAPI backend runs. Set BACKEND_URL on Vercel to the deployed API.
const BACKEND_URL =
  process.env.BACKEND_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:8000" : undefined);

if (!BACKEND_URL) {
  throw new Error("BACKEND_URL must be set to the public Render backend URL in production.");
}

const normalizedBackendUrl = BACKEND_URL.replace(/\/+$/, "");

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
    return [{ source: "/api/:path*", destination: `${normalizedBackendUrl}/api/:path*` }];
  },
};

export default nextConfig;
