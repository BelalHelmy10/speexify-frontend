// app/manifest.js
export default function manifest() {
  return {
    name: "Speexify — Where Ambition Meets Fluency",
    short_name: "Speexify",
    description:
      "1-on-1 English coaching that turns what you already know into real confidence",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f25c2e", // Brand coral
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
