// app/resources/prep/PrepVideoCall.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { JITSI_DOMAIN, buildJitsiOptions } from "@/lib/jitsiConfig";

export default function PrepVideoCall({
  roomId,
  userName,
  isTeacher,
  onScreenShareStreamChange,
}) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stable ref for the callback so changes don't re-init Jitsi
  const screenShareCbRef = useRef(onScreenShareStreamChange);
  useEffect(() => {
    screenShareCbRef.current = onScreenShareStreamChange;
  }, [onScreenShareStreamChange]);

  // Helper: ensure external_api.js is loaded exactly once
  async function ensureJitsiScript() {
    if (typeof window === "undefined") return;

    if (window.JitsiMeetExternalAPI) return;

    const existing = document.getElementById("jitsi-external-api");
    if (existing) {
      // Wait until it finishes loading
      await new Promise((resolve, reject) => {
        if (existing.getAttribute("data-loaded") === "true") return resolve();
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", (e) => reject(e), { once: true });
      });
      return;
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = "jitsi-external-api";
      script.src = `https://${JITSI_DOMAIN}/external_api.js`;
      script.async = true;
      script.onload = () => {
        script.setAttribute("data-loaded", "true");
        resolve();
      };
      script.onerror = (e) => reject(e);
      document.body.appendChild(script);
    });
  }

  // Main Jitsi init effect
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === "undefined") return;
      if (!roomId) return;
      if (!containerRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        // Load script if needed
        await ensureJitsiScript();
        if (cancelled) return;

        const JitsiAPI = window.JitsiMeetExternalAPI;
        if (!JitsiAPI) {
          throw new Error("JitsiMeetExternalAPI not available on window");
        }

        const options = buildJitsiOptions({
          roomId,
          userName,
          isTeacher: !!isTeacher,
          parentNode: containerRef.current,
        });

        const api = new JitsiAPI(JITSI_DOMAIN, options);
        apiRef.current = api;

        // Jitsi UI is now mounted; hide "Connecting…" overlay
        setIsLoading(false);
        setError(null);

        // Events
        api.addListener("videoConferenceJoined", () => {
          setError(null);
        });

        api.addListener("videoConferenceLeft", () => {
          // optional: handle leave
        });

        api.addListener("errorOccurred", (e) => {
          console.error("Jitsi error:", e);
          if (e?.error?.name === "conference.connectionError") {
            setError(
              "Connection error. Please check your internet connection."
            );
          } else {
            setError("Video call error. Please try again.");
          }
        });

        api.addListener("screenSharingStatusChanged", (status) => {
          const cb = screenShareCbRef.current;
          if (typeof cb === "function") {
            // We still only expose boolean active vs not, as designed in ClassroomShell
            cb(status.on ? true : null);
          }
        });

        api.addListener("readyToClose", () => {
          // user clicked hangup
        });
      } catch (err) {
        console.error("Failed to initialize Jitsi:", err);
        if (!cancelled) {
          setError("Failed to start video call. Please try again.");
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        apiRef.current?.dispose();
      } catch (e) {
        console.warn("Error disposing Jitsi API:", e);
      }
      apiRef.current = null;
    };
  }, [roomId, userName, isTeacher]); // NOTE: callback NOT in deps

  return (
    <div className="cr-video">
      {/* Loading state – only while script/API bootstraps */}
      {isLoading && !error && (
        <div className="cr-video__loading">
          <div className="cr-video__spinner" />
          <span>Connecting to classroom…</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="cr-video__error">
          <span className="cr-video__error-icon">⚠️</span>
          <p>{error}</p>
          <button
            className="cr-video__retry"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Jitsi container */}
      <div
        ref={containerRef}
        className="cr-video__frame"
        style={{
          width: "100%",
          height: "100%",
          opacity: error ? 0.2 : 1,
          transition: "opacity 0.3s ease",
        }}
      />
    </div>
  );
}
