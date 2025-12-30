// app/manifest.js
export default function manifest() {
  return {
    name: "Speexify - Language & Communication Coaching",
    short_name: "Speexify",
    description:
      "Personalized language and communication coaching for teams and professionals",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0284c7", // Your brand blue
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
