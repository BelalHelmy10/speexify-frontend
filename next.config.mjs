/** @type {import('next').NextConfig} */

const rawBase =
  process.env.BACKEND_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5050";

const apiBase = rawBase.replace(/\/+$/, "").replace(/\/api$/, "");

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiBase}/api/:path*` }];
  },
};

export default nextConfig;
