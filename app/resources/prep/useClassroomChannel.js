// app/resources/prep/useClassroomChannel.js
"use client";

import { useEffect, useRef, useState } from "react";
import { getRoomConnection } from "./webrtcClient";
// This is pseudo-code – whatever you already use to join the room.

export function useClassroomChannel(roomId, topic) {
  const [ready, setReady] = useState(false);
  const handlersRef = useRef([]);

  useEffect(() => {
    const room = getRoomConnection(roomId); // join / reuse existing room
    const channel = room.getOrCreateDataChannel(topic);

    channel.on("message", (msg) => {
      let data = msg;
      try {
        if (typeof msg === "string") data = JSON.parse(msg);
      } catch {}
      handlersRef.current.forEach((fn) => fn(data));
    });

    channel.on("open", () => setReady(true));

    return () => {
      channel.close?.();
    };
  }, [roomId, topic]);

  function send(data) {
    try {
      const payload = typeof data === "string" ? data : JSON.stringify(data);
      // channel might not be ready yet
      if (ready) {
        const room = getRoomConnection(roomId);
        room.getOrCreateDataChannel(topic).send(payload);
      }
    } catch (err) {
      console.warn("Failed to send classroom message", err);
    }
  }

  function subscribe(handler) {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }

  return { ready, send, subscribe };
}
