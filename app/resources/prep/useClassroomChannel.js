// app/resources/prep/useClassroomChannel.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_RECONNECT_DELAY_MS = 30000;

function resolveWsCandidates() {
  const directBackend = process.env.NEXT_PUBLIC_DIRECT_BACKEND === "1";
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  let sameOriginUrl = "";
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    sameOriginUrl = `${protocol}//${window.location.host}/ws/classroom`;
  }

  let apiBaseUrl = "";
  if (apiBase) {
    try {
      const url = new URL(apiBase);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = "/ws/classroom";
      url.search = "";
      url.hash = "";
      apiBaseUrl = url.toString();
    } catch {
      apiBaseUrl = "";
    }
  }

  const ordered = directBackend
    ? [apiBaseUrl, sameOriginUrl]
    : [sameOriginUrl, apiBaseUrl];

  return [...new Set(ordered.filter(Boolean))];
}

export function useClassroomChannel(roomId) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("idle");

  const wsRef = useRef(null);
  const handlersRef = useRef([]);
  const retryAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const closingRef = useRef(false);
  const currentUrlIndexRef = useRef(0);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    heartbeatIntervalRef.current = setInterval(() => {
      const sock = wsRef.current;
      if (!sock || sock.readyState !== WebSocket.OPEN) return;

      try {
        sock.send(
          JSON.stringify({
            type: "ping",
            ts: Date.now(),
          })
        );
      } catch (err) {
        console.warn("Classroom WS ping failed", err);
      }
    }, 25000);
  }, [stopHeartbeat]);

  const connect = useCallback(
    (urlIndex = 0) => {
      if (!roomId) return;
      if (typeof window === "undefined") return;

      const urls = resolveWsCandidates();
      if (!urls.length) {
        setStatus("error");
        setReady(false);
        return;
      }

      const normalizedIndex = Math.min(
        Math.max(Number(urlIndex) || 0, 0),
        urls.length - 1
      );
      const wsUrl = urls[normalizedIndex];

      clearReconnectTimeout();

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

      if (typeof window !== "undefined") {
        window.__ws_classroom = ws;
      }

      let opened = false;

      ws.onopen = () => {
        if (closingRef.current) return;

        opened = true;
        retryAttemptRef.current = 0;
        currentUrlIndexRef.current = normalizedIndex;
        setReady(true);
        setStatus("ready");

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

        if (msg?.type === "ping" || msg?.type === "pong") return;

        if (msg?.type === "error") {
          console.warn("Classroom WS server error", msg?.message || "unknown");
          return;
        }

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
      };

      ws.onclose = () => {
        stopHeartbeat();
        setReady(false);

        if (closingRef.current) {
          setStatus("closed");
          return;
        }

        const nextCandidateIndex = opened
          ? currentUrlIndexRef.current
          : normalizedIndex + 1;

        if (!opened && nextCandidateIndex < urls.length) {
          currentUrlIndexRef.current = nextCandidateIndex;
          connect(nextCandidateIndex);
          return;
        }

        const attempt = retryAttemptRef.current + 1;
        retryAttemptRef.current = attempt;

        if (attempt > MAX_RECONNECT_ATTEMPTS) {
          setStatus("closed");
          return;
        }

        const delay = Math.min(
          MAX_RECONNECT_DELAY_MS,
          1000 * Math.pow(2, attempt - 1)
        );

        setStatus("reconnecting");

        reconnectTimeoutRef.current = setTimeout(() => {
          connect(currentUrlIndexRef.current);
        }, delay);
      };
    },
    [roomId, clearReconnectTimeout, startHeartbeat, stopHeartbeat]
  );

  useEffect(() => {
    if (!roomId) {
      setReady(false);
      setStatus("idle");
      return;
    }

    retryAttemptRef.current = 0;
    currentUrlIndexRef.current = 0;
    connect(0);

    return () => {
      closingRef.current = true;

      clearReconnectTimeout();
      stopHeartbeat();

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
  }, [roomId, connect, clearReconnectTimeout, stopHeartbeat]);

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
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
