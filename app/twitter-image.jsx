import { ImageResponse } from "next/og";
import { BRAND_DESCRIPTION, BRAND_SITE_TITLE } from "@/lib/brand";

export const alt = BRAND_SITE_TITLE;
export const size = {
  width: 1200,
  height: 675,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#f8fafc",
          background:
            "linear-gradient(145deg, #081827 0%, #15566d 54%, #f4c667 100%)",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          <span>Speexify</span>
          <span style={{ fontSize: 22, color: "rgba(248,250,252,0.78)" }}>
            speexify.com
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              maxWidth: 900,
              fontSize: 76,
              lineHeight: 0.98,
              letterSpacing: "-0.06em",
              fontWeight: 900,
            }}
          >
            English speaking coaching for real career moments
          </div>
          <div
            style={{
              maxWidth: 780,
              fontSize: 31,
              lineHeight: 1.25,
              color: "rgba(248,250,252,0.86)",
            }}
          >
            {BRAND_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    size
  );
}
