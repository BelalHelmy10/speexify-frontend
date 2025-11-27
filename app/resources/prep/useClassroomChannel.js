// app/resources/prep/useClassroomChannel.js
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Classroom channel implemented using the SAME websocket signaling server as video,
 * but with a custom message type: "classroom-event".
 *
 * This avoids interfering with WebRTC signaling ("offer", "answer", "candidate")
 * while still using the same roomId system.
 */

export function useClassroomChannel(roomId) {
  const [ready, setReady] = useState(false);
  const handlersRef = useRef([]);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    let wsUrl = "";
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    if (apiBase) {
      const url = new URL(apiBase);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/ws/prep";
      wsUrl = url.toString();
    } else {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${wsProtocol}//${window.location.host}/ws/prep`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId }));
      setReady(true);
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      // We only listen for classroom events
      if (msg.type === "classroom-event") {
        handlersRef.current.forEach((fn) => fn(msg.payload));
      }
    };

    ws.onclose = () => {
      setReady(false);
    };

    return () => {
      ws.close();
      setReady(false);
    };
  }, [roomId]);

  function send(payload) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(
      JSON.stringify({
        type: "classroom-event", // custom type
        payload,
      })
    );
  }

  function subscribe(handler) {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }

  return { ready, send, subscribe };
}
