// app/resources/prep/PrepVideoCall.jsx
"use client";

import { useEffect, useRef } from "react";

const JITSI_DOMAIN =
  process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.speexify.com";

export default function PrepVideoCall({
  roomId,
  userName,
  isTeacher,
  onScreenShareStreamChange, // kept for future use
}) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!roomId) return;
    if (!containerRef.current) return;

    const JitsiAPI = window.JitsiMeetExternalAPI;
    if (!JitsiAPI) {
      console.error("JitsiMeetExternalAPI not found on window");
      return;
    }

    // Example: speexify-classroom-9
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
        disableDeepLinking: true,
      },
      interfaceConfigOverwrite: {
        // you can tweak toolbar later if you want
      },
    });

    apiRef.current = api;

    // (optional) hook screen-share events later using onScreenShareStreamChange

    return () => {
      try {
        api.dispose();
      } catch (e) {
        console.warn("Error disposing Jitsi API", e);
      }
      apiRef.current = null;
    };
  }, [roomId, userName, isTeacher, onScreenShareStreamChange]);

  return (
    <div className="prep-video">
      <div className="prep-video__frame-wrapper">
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
