"use client";

import { useEffect } from "react";
import { getAnalyticsMeasurementId } from "@/lib/analytics";

const GOOGLE_TAG_SCRIPT_ID = "speexify-google-analytics";

export default function AnalyticsScript() {
  const measurementId = getAnalyticsMeasurementId();

  useEffect(() => {
    if (!measurementId || typeof window === "undefined") return;
    if (window.__speexifyAnalyticsMeasurementId === measurementId) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { send_page_view: false });
    window.__speexifyAnalyticsMeasurementId = measurementId;

    if (document.getElementById(GOOGLE_TAG_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = GOOGLE_TAG_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }, [measurementId]);

  return null;
}
