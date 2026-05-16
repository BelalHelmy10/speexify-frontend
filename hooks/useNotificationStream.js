"use client";

import { useEffect, useRef } from "react";
import { API_STREAM } from "@/lib/notifications";

/**
 * Subscribe to SSE notification events for the logged-in user.
 */
export function useNotificationStream({ enabled, onEvent }) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return undefined;

    const source = new EventSource(API_STREAM, { withCredentials: true });

    const handlePayload = (event) => {
      try {
        const data = JSON.parse(event.data || "{}");
        onEventRef.current?.(data, event.type);
      } catch {
        /* ignore malformed payloads */
      }
    };

    source.addEventListener("notification", handlePayload);
    source.addEventListener("connected", handlePayload);

    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, [enabled]);
}
