/** @type {import('next').NextConfig} */
const apiBase = (
  process.env.BACKEND_API_BASE || // ← use a server-side var on Vercel
  process.env.NEXT_PUBLIC_API_URL || // fallback if you insist
  "http://localhost:5050"
) // local dev
  .replace(/\/+$/, "");

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: { domains: ["lh3.googleusercontent.com"] },
  async rewrites() {
    // /api/* → https://<your-backend>/api/*  (server-side rewrite)
    return [{ source: "/api/:path*", destination: `${apiBase}/api/:path*` }];
  },
};

export default nextConfig;
