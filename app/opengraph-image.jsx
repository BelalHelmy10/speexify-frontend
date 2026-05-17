import { ImageResponse } from "next/og";

export const alt = "Speexify — Where Ambition Meets Fluency";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
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
            "linear-gradient(135deg, #07111f 0%, #0f3d56 48%, #f2b84b 100%)",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 34,
            letterSpacing: "-0.03em",
            fontWeight: 800,
          }}
        >
          <span>Speexify</span>
          <span
            style={{
              border: "2px solid rgba(248,250,252,0.5)",
              borderRadius: 999,
              padding: "12px 22px",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Unleash your voice
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              maxWidth: 920,
              fontSize: 80,
              lineHeight: 0.95,
              letterSpacing: "-0.06em",
              fontWeight: 900,
            }}
          >
            Your English should be as sharp as your ambition
          </div>
          <div
            style={{
              maxWidth: 760,
              fontSize: 32,
              lineHeight: 1.25,
              color: "rgba(248,250,252,0.86)",
            }}
          >
            1-on-1 coaching that turns what you already know into real confidence.
          </div>
        </div>
      </div>
    ),
    size
  );
}
