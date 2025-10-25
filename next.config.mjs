/** @type {import('next').NextConfig} */

// Choose your backend base depending on environment
const apiBase = (
  process.env.BACKEND_API_BASE || // For Vercel (server-side var)
  process.env.NEXT_PUBLIC_API_URL || // For local/direct testing
  "http://localhost:5050"
) // Default fallback for dev
  .replace(/\/+$/, ""); // remove trailing slashes for safety

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: { domains: ["lh3.googleusercontent.com"] },

  async rewrites() {
    return [
      {
        // ✅ Rewrites all /api/* calls from frontend → backend API
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },

  // 🔒 Ensure Next.js knows to trust your backend for cookies (optional but wise)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
