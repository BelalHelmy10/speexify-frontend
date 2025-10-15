// web/src/components/ResponsiveImage.jsx
import React from "react";

/**
 * ResponsiveImage renders <picture> with AVIF → WebP → JPEG fallbacks,
 * srcset/sizes, lazy loading, and optional LCP priority.
 *
 * File naming convention (place in /public/images):
 *   <name>@<width>w.avif
 *   <name>@<width>w.webp
 *   <name>@<width>w.jpg
 *
 * Example: hero@800w.avif, hero@1200w.webp, hero@1600w.jpg
 */
export default function ResponsiveImage({
  name, // base file name (without extension & size) e.g. "hero"
  alt,
  widths = [480, 768, 1200, 1600, 2000],
  sizes = "(max-width: 768px) 100vw, 50vw",
  className,
  // Use either (w,h) to set width/height attributes OR aspectRatio for CSS.
  w,
  h,
  aspectRatio, // e.g. "16/9" or "4/3" (used via style if w/h not provided)
  priority = false, // true for LCP (hero) images
  decoding = "async",
}) {
  const toSrcSet = (ext) =>
    widths.map((px) => `/images/${name}@${px}w.${ext} ${px}w`).join(", ");

  const loading = priority ? "eager" : "lazy";
  const fetchPriority = priority ? "high" : undefined;

  const style = !w && !h && aspectRatio ? { aspectRatio } : undefined;

  // Fallback <img> uses the middle width as a safe default src.
  const mid = widths[Math.floor(widths.length / 2)];

  return (
    <picture className={className}>
      {/* AVIF first */}
      <source type="image/avif" srcSet={toSrcSet("avif")} sizes={sizes} />
      {/* WebP fallback */}
      <source type="image/webp" srcSet={toSrcSet("webp")} sizes={sizes} />
      {/* JPEG final fallback */}
      <img
        src={`/images/${name}@${mid}w.jpg`}
        alt={alt}
        loading={loading}
        decoding={decoding}
        fetchpriority={fetchPriority}
        sizes={sizes}
        width={w}
        height={h}
        style={style}
      />
    </picture>
  );
}
