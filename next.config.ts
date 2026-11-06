import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is fully auth-driven (cookies/headers on every page), so we
  // opt out of Cache Components' blocking-prerender requirements.
  cacheComponents: false,
  images: {
    // Uploaded files are streamed from /uploads by a route handler.
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
