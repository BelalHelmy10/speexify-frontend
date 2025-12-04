// app/resources/prep/PrepVideoCall.jsx
"use client";

import { useEffect, useRef, useState } from "react";

const JITSI_DOMAIN =
  process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.speexify.com";

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
      // wait until it finishes loading
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

        const roomName = `speexify-classroom-${roomId}`;

        const api = new JitsiAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: {
            displayName: userName || (isTeacher ? "Teacher" : "Learner"),
          },
          configOverwrite: {
            // Core settings
            disableDeepLinking: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,

            // UI simplification
            disableModeratorIndicator: false,
            disableReactions: true,
            disablePolls: true,
            disableSelfView: false,

            // Quality settings
            resolution: 720,
            constraints: {
              video: {
                height: { ideal: 720, max: 720, min: 240 },
                width: { ideal: 1280, max: 1280, min: 320 },
              },
            },

            // Reduce bandwidth usage
            enableLayerSuspension: true,
            channelLastN: 2,

            // Disable features we don't need
            enableWelcomePage: false,
            enableClosePage: false,

            // Pre-join settings (we keep it for device testing)
            prejoinConfig: {
              enabled: true,
              hideDisplayName: false,
              hideExtraJoinButtons: ["no-audio", "by-phone"],
            },

            // Lobby settings
            enableLobbyChat: false,

            // Recording / streaming
            fileRecordingsEnabled: false,
            liveStreamingEnabled: false,

            // Etherpad
            etherpad_base: undefined,

            // Breakout rooms
            breakoutRooms: {
              hideAddRoomButton: true,
              hideAutoAssignButton: true,
              hideJoinRoomButton: true,
            },
          },
          interfaceConfigOverwrite: {
            APP_NAME: "Speexify Classroom",
            DEFAULT_BACKGROUND: "#0f172a",
            DEFAULT_LOCAL_DISPLAY_NAME: isTeacher ? "Teacher" : "Learner",
            DEFAULT_REMOTE_DISPLAY_NAME: "Participant",

            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            HIDE_INVITE_MORE_HEADER: true,
            HIDE_DEEP_LINKING_LOGO: true,

            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "desktop",
              "fullscreen",
              "hangup",
              "settings",
              "videoquality",
              "tileview",
            ],

            DISABLE_FOCUS_INDICATOR: true,
            DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
            DISABLE_VIDEO_BACKGROUND: false,
            DISABLE_TRANSCRIPTION_SUBTITLES: true,

            FILM_STRIP_MAX_HEIGHT: 120,
            VERTICAL_FILMSTRIP: true,
            MOBILE_APP_PROMO: false,
            TILE_VIEW_MAX_COLUMNS: 2,
            VIDEO_LAYOUT_FIT: "both",
          },
        });

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
            // true when Jitsi is actively sharing a screen, false otherwise
            cb(Boolean(status?.on));
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
