/** @type {import('next').NextConfig} */
const apiBase = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050"
).replace(/\/+$/, "");

const nextConfig = {
  // Only keep this if CI must not fail on lint; otherwise remove it.
  eslint: { ignoreDuringBuilds: true },

  images: {
    // Add more if you load external images from other hosts
    domains: ["lh3.googleusercontent.com"],
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
