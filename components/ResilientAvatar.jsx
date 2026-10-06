"use client";

import { useEffect, useState } from "react";

export default function ResilientAvatar({ src, alt = "", fallback, ...props }) {
  const [failedSource, setFailedSource] = useState("");

  useEffect(() => {
    setFailedSource("");
  }, [src]);

  if (!src || failedSource === src) return fallback;

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      onError={() => setFailedSource(src)}
    />
  );
}
