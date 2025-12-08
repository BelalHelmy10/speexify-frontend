// app/resources/prep/PrepVideoCall.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { JITSI_DOMAIN, buildJitsiOptions } from "@/lib/jitsiConfig";
import { getDictionary, t } from "@/app/i18n";

export default function PrepVideoCall({
  roomId,
  userName,
  isTeacher,
  onScreenShareStreamChange,
  locale = "en",
}) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const dict = getDictionary(locale, "classroom");

  // keep callback stable
  const screenShareCbRef = useRef(onScreenShareStreamChange);
  useEffect(() => {
    screenShareCbRef.current = onScreenShareStreamChange;
  }, [onScreenShareStreamChange]);

  async function ensureJitsiScript() {
    if (typeof window === "undefined") return;

    if (window.JitsiMeetExternalAPI) return;

    const existing = document.getElementById("jitsi-external-api");
    if (existing) {
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

  // 🔧 MAIN FIX: only depend on roomId (and optionally locale if you really want)
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === "undefined") return;
      if (!roomId) return;
      if (!containerRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
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

        setIsLoading(false);
        setError(null);

        api.addListener("videoConferenceJoined", () => {
          setError(null);
        });

        api.addListener("errorOccurred", (e) => {
          console.error("Jitsi error:", e);
          if (e?.error?.name === "conference.connectionError") {
            setError(t(dict, "classroom_video_error_connection"));
          } else {
            setError(t(dict, "classroom_video_error_generic"));
          }
        });

        api.addListener("screenSharingStatusChanged", (status) => {
          const cb = screenShareCbRef.current;
          if (typeof cb === "function") {
            cb(status.on ? true : null);
          }
        });
      } catch (err) {
        console.error("Failed to initialize Jitsi:", err);
        if (!cancelled) {
          setError(t(dict, "classroom_video_error_generic"));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // ✅ only roomId

  return (
    <div className="cr-video">
      {isLoading && !error && (
        <div className="cr-video__loading">
          <div className="cr-video__spinner" />
          <span>{t(dict, "classroom_video_connecting")}</span>
        </div>
      )}

      {error && (
        <div className="cr-video__error">
          <span className="cr-video__error-icon">⚠️</span>
          <p>{error}</p>
          <button
            className="cr-video__retry"
            onClick={() => window.location.reload()}
          >
            {t(dict, "classroom_video_retry")}
          </button>
        </div>
      )}

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
