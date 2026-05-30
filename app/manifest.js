// app/manifest.js
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_SITE_TITLE } from "@/lib/brand";

export default function manifest() {
  return {
    name: BRAND_SITE_TITLE,
    short_name: BRAND_NAME,
    description: BRAND_DESCRIPTION,
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
