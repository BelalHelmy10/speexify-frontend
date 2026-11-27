"use client";

import { useEffect, useRef, useState } from "react";

// A profile photo that falls back (usually to initials) when it can't load.
export default function ResilientAvatar({ src, alt = "", fallback, ...props }) {
  const [failedSource, setFailedSource] = useState("");
  const imgRef = useRef(null);

  useEffect(() => {
    // A server-rendered image can fail before React is listening, so its
    // error event is never seen; a finished image with no size has failed.
    const img = imgRef.current;
    setFailedSource(img && img.complete && img.naturalWidth === 0 ? src : "");
  }, [src]);

  if (!src || failedSource === src) return fallback;

  return (
    <img
      {...props}
      ref={imgRef}
      src={src}
      alt={alt}
      onError={() => setFailedSource(src)}
    />
  );
}
