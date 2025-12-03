"use client";

import { useEffect, useRef } from "react";

export default function JitsiTestPage() {
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    // Load Jitsi script if not already loaded
    const existing = document.getElementById("jitsi-external-api");
    const loadScript = () =>
      new Promise((resolve) => {
        if (existing) return resolve();
        const script = document.createElement("script");
        script.src = "https://meet.speexify.com/external_api.js";
        script.async = true;
        script.id = "jitsi-external-api";
        script.onload = resolve;
        document.body.appendChild(script);
      });

    loadScript().then(() => {
      if (!containerRef.current || apiRef.current) return;

      const domain = "meet.speexify.com";
      const options = {
        roomName: "SpeexifyTestRoom123", // any test name
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        configOverwrite: {},
        interfaceConfigOverwrite: {},
      };

      // eslint-disable-next-line no-undef
      apiRef.current = new JitsiMeetExternalAPI(domain, options);
    });

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", background: "#000" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
