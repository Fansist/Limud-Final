import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  },
  images: {
    remotePatterns: []
  },
  // Explicit webpack alias for the `@/` path. tsconfig.json's `paths`
  // already declares this and Next.js usually picks it up, but on some
  // build hosts (notably Render's Linux + Node 20 image) the
  // tsconfig-driven alias drops out for the client compilation pass
  // and `@/components/...` imports from `"use client"` files fail to
  // resolve. This webpack alias guarantees the same path map for both
  // server and client bundles.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@": path.resolve(__dirname, "src")
    };
    return config;
  }
};

export default nextConfig;
