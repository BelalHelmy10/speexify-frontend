// app/resources/prep/useClassroomChannel.js
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Classroom channel using the SAME WebSocket signaling server as PrepVideoCall.
 *
 * We wrap our payload in a "signal" message with signalType="classroom-event"
 * so the backend forwards it to the other peer:
 *
 *   { type: "signal", signalType: "classroom-event", data: {...} }
 */

export function useClassroomChannel(roomId) {
  const [ready, setReady] = useState(false);
  const wsRef = useRef(null);
  const handlersRef = useRef([]);

  useEffect(() => {
    if (!roomId) return;

    let wsUrl = "";
    const apiBase = process.env.NEXT_PUBLIC_API_URL;

    if (apiBase) {
      const url = new URL(apiBase);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/ws/prep";
      url.search = "";
      wsUrl = url.toString();
    } else {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${wsProtocol}//${window.location.host}/ws/prep`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // debug handle
    if (typeof window !== "undefined") {
      window.__ws_debug = ws;
    }

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          roomId: String(roomId),
        })
      );
      setReady(true);
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      // Only handle our classroom events
      if (
        msg.type === "signal" &&
        msg.signalType === "classroom-event" &&
        msg.data
      ) {
        handlersRef.current.forEach((fn) => {
          try {
            fn(msg.data);
          } catch (err) {
            console.warn("Classroom handler error", err);
          }
        });
      }
    };

    ws.onclose = () => {
      setReady(false);
      if (wsRef.current === ws) wsRef.current = null;
    };

    ws.onerror = () => {
      setReady(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [roomId]);

  function send(payload) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(
      JSON.stringify({
        type: "signal",
        signalType: "classroom-event",
        data: payload,
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
