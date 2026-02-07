/** @type {import('next').NextConfig} */

// BACKEND_API_BASE is preferred (server-only on Vercel)
// NEXT_PUBLIC_API_URL is a fallback (client-exposed; avoid if possible)
const rawBase =
  process.env.BACKEND_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5050";

// Normalize:
// - remove trailing slashes
// - if someone set ".../api", strip that so we don't end up with "/api/api"
const apiBase = rawBase.replace(/\/+$/, "").replace(/\/api$/, "");

const nextConfig = {
  images: { domains: ["lh3.googleusercontent.com"] },

  async rewrites() {
    // /api/* (Next) → <backend>/api/* (Express)
    return [{ source: "/api/:path*", destination: `${apiBase}/api/:path*` }];
  },
};

export default nextConfig;
