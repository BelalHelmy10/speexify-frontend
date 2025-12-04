// app/resources/prep/useClassroomChannel.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Classroom channel using its own WebSocket server at /ws/classroom.
 *
 * We wrap our payload in a "signal" message with signalType="classroom-event"
 * so the backend forwards it to the other peer:
 *
 *   { type: "signal", signalType: "classroom-event", data: {...} }
 *
 * This version adds:
 *  - Reconnection with exponential backoff
 *  - Simple heartbeat/ping
 *  - Status flags: "connecting" | "ready" | "reconnecting" | "closed" | "error"
 */
export function useClassroomChannel(roomId) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("idle"); // "idle" | "connecting" | "ready" | "reconnecting" | "closed" | "error"

  const wsRef = useRef(null);
  const handlersRef = useRef([]);
  const retryAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const closingRef = useRef(false); // distinguish intentional unmount-close vs network issues

  // ─────────────────────────────────────────────────────────────
  // Build WS URL (shared between connects)
  // ─────────────────────────────────────────────────────────────
  const buildWsUrl = useCallback(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    let wsUrl = "";

    if (apiBase) {
      const url = new URL(apiBase);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/ws/classroom";
      url.search = "";
      wsUrl = url.toString();
    } else if (typeof window !== "undefined") {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${wsProtocol}//${window.location.host}/ws/classroom`;
    }

    return wsUrl;
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Heartbeat / ping to keep connection alive
  // ─────────────────────────────────────────────────────────────
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();

    if (!wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    // Ping every 25s (adjust as needed)
    heartbeatIntervalRef.current = setInterval(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      try {
        ws.send(
          JSON.stringify({
            type: "ping",
            ts: Date.now(),
          })
        );
      } catch (err) {
        // Swallow; onerror/onclose will handle reconnection
        console.warn("Classroom WS ping failed", err);
      }
    }, 25000);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Reconnect logic (exponential backoff)
  // ─────────────────────────────────────────────────────────────
  const scheduleReconnect = useCallback(() => {
    if (closingRef.current) return; // we are unmounting intentionally

    const attempt = retryAttemptRef.current + 1;
    retryAttemptRef.current = attempt;

    const maxAttempts = 10;
    if (attempt > maxAttempts) {
      setReady(false);
      setStatus("closed");
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s... capped at 30s
    const delay = Math.min(30000, 1000 * Math.pow(2, attempt - 1));

    setStatus(attempt === 1 ? "reconnecting" : "reconnecting");

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Main connect function
  // ─────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!roomId) return;
    if (typeof window === "undefined") return;

    const wsUrl = buildWsUrl();
    if (!wsUrl) {
      console.warn("useClassroomChannel: No WebSocket URL resolved");
      setStatus("error");
      setReady(false);
      return;
    }

    // If there is an existing socket, close it before opening a new one
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    closingRef.current = false;
    setStatus(retryAttemptRef.current > 0 ? "reconnecting" : "connecting");
    setReady(false);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Optional debug handle in the browser console
    if (typeof window !== "undefined") {
      window.__ws_classroom = ws;
    }

    ws.onopen = () => {
      if (closingRef.current) return;

      // Reset retry attempts
      retryAttemptRef.current = 0;
      setReady(true);
      setStatus("ready");

      // Join the room
      ws.send(
        JSON.stringify({
          type: "join",
          roomId: String(roomId),
        })
      );

      startHeartbeat();
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      // Ignore pings/pongs
      if (msg?.type === "ping" || msg?.type === "pong") return;

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

    ws.onerror = () => {
      if (closingRef.current) return;
      setReady(false);
      setStatus("error");
      stopHeartbeat();
      // Let onclose handle scheduling reconnect
    };

    ws.onclose = () => {
      stopHeartbeat();
      setReady(false);

      if (closingRef.current) {
        // Intentional close (unmount / roomId change), don't reconnect
        setStatus("closed");
        return;
      }

      scheduleReconnect();
    };
  }, [buildWsUrl, roomId, scheduleReconnect, startHeartbeat, stopHeartbeat]);

  // ─────────────────────────────────────────────────────────────
  // Effect: connect / cleanup when roomId changes
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) {
      setReady(false);
      setStatus("idle");
      return;
    }

    // Reset retry count and connect
    retryAttemptRef.current = 0;
    connect();

    return () => {
      // Mark as intentionally closing so we don't auto-reconnect
      closingRef.current = true;

      // Clear reconnect timer
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Stop heartbeat
      stopHeartbeat();

      // Close socket
      const ws = wsRef.current;
      if (ws) {
        try {
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        } catch {
          // ignore
        }
      }
      wsRef.current = null;
      setReady(false);
      setStatus("closed");
    };
  }, [roomId, connect, stopHeartbeat]);

  // ─────────────────────────────────────────────────────────────
  // Public API: send, subscribe
  // ─────────────────────────────────────────────────────────────
  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // Silently ignore to keep backwards-compat; could console.warn if you want
      return;
    }

    try {
      ws.send(
        JSON.stringify({
          type: "signal",
          signalType: "classroom-event",
          data: payload,
        })
      );
    } catch (err) {
      console.warn("Failed to send classroom payload", err);
    }
  }, []);

  const subscribe = useCallback((handler) => {
    if (typeof handler !== "function") return () => {};

    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  const isReconnecting =
    status === "reconnecting" ||
    (status === "connecting" && retryAttemptRef.current > 0);

  return {
    ready,
    send,
    subscribe,
    status,
    isReconnecting,
  };
}
