// app/resources/prep/useClassroomChannel.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import api from "@/lib/api";

const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_RECONNECT_DELAY_MS = 30000;
const WS_TOKEN_REFRESH_SKEW_MS = 30000;
const WS_CONNECT_TIMEOUT_MS = 7000;
const WS_CONFIG_ENDPOINTS = ["/ws-config", "/api/ws-config"];

function resolveWsCandidates(configuredWsUrl = "") {
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
    ? [configuredWsUrl, apiBaseUrl, sameOriginUrl]
    : [configuredWsUrl, sameOriginUrl, apiBaseUrl];

  return [...new Set(ordered.filter(Boolean))];
}

function appendWsToken(wsUrl, token) {
  if (!token) return wsUrl;
  try {
    const url = new URL(wsUrl);
    url.searchParams.set("token", token);
    return url.toString();
  } catch {
    return wsUrl;
  }
}

function createWebSocket(wsUrl, token) {
  const urlWithToken = appendWsToken(wsUrl, token);
  if (!token) {
    return new WebSocket(urlWithToken);
  }

  try {
    return new WebSocket(urlWithToken, [token]);
  } catch {
    return new WebSocket(urlWithToken);
  }
}

function isPromiseLike(value) {
  return (
    !!value &&
    (typeof value === "object" || typeof value === "function") &&
    typeof value.then === "function"
  );
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
  const wsEndpointStateRef = useRef({
    url: "",
    loaded: false,
    inflight: null,
  });
  const wsTokenStateRef = useRef({
    token: null,
    expiresAt: 0,
    inflight: null,
  });

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

  const getConfiguredWsUrl = useCallback(async () => {
    if (typeof window === "undefined") return "";

    const state = wsEndpointStateRef.current;
    if (state.inflight && !isPromiseLike(state.inflight)) {
      state.inflight = null;
    }

    if (state.loaded && !state.inflight) {
      return state.url || "";
    }

    if (state.inflight) {
      return state.inflight;
    }

    const inflight = (async () => {
      try {
        for (const endpoint of WS_CONFIG_ENDPOINTS) {
          const res = await fetch(endpoint, {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-store",
            },
          });

          if (!res.ok) {
            continue;
          }

          const data = await res.json().catch(() => null);
          const url =
            typeof data?.classroomWsUrl === "string" ? data.classroomWsUrl : "";
          if (!url) {
            continue;
          }

          wsEndpointStateRef.current.url = url;
          return url;
        }

        return state.url || "";
      } catch {
        return state.url || "";
      } finally {
        wsEndpointStateRef.current.loaded = true;
        wsEndpointStateRef.current.inflight = null;
      }
    })();

    wsEndpointStateRef.current.inflight = inflight;
    return inflight;
  }, []);

  const getWsAuthToken = useCallback(async () => {
    if (typeof window === "undefined") return null;

    const state = wsTokenStateRef.current;
    const now = Date.now();

    if (state.inflight && !isPromiseLike(state.inflight)) {
      state.inflight = null;
    }

    if (
      state.token &&
      Number.isFinite(Number(state.expiresAt)) &&
      Number(state.expiresAt) - now > WS_TOKEN_REFRESH_SKEW_MS
    ) {
      return state.token;
    }

    if (state.inflight) {
      return state.inflight;
    }

    const inflight = (async () => {
      try {
        const { data } = await api.get("/auth/ws-token", {
          headers: {
            "Cache-Control": "no-store",
          },
        });

        const token = typeof data?.token === "string" ? data.token : "";
        const expiresAt = Number(data?.expiresAt) || 0;

        if (!token) {
          wsTokenStateRef.current.token = null;
          wsTokenStateRef.current.expiresAt = 0;
          return null;
        }

        wsTokenStateRef.current.token = token;
        wsTokenStateRef.current.expiresAt = expiresAt;
        return token;
      } catch {
        const fallbackToken =
          state.token &&
          Number.isFinite(Number(state.expiresAt)) &&
          Number(state.expiresAt) > now
            ? state.token
            : null;

        wsTokenStateRef.current.token = fallbackToken;
        wsTokenStateRef.current.expiresAt = fallbackToken ? Number(state.expiresAt) : 0;
        return fallbackToken;
      }
    })();

    const inflightPromise = Promise.resolve(inflight);

    const clearInflight = () => {
      if (wsTokenStateRef.current.inflight === inflightPromise) {
        wsTokenStateRef.current.inflight = null;
      }
    };
    inflightPromise.then(clearInflight, clearInflight);

    wsTokenStateRef.current.inflight = inflightPromise;
    return inflightPromise;
  }, []);

  const connect = useCallback(
    (urlIndex = 0) => {
      if (!roomId) return;
      if (typeof window === "undefined") return;

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

      const establishConnection = async () => {
        console.log("[Classroom WS] Starting connection for room:", roomId);
        
        const configuredWsUrl = await getConfiguredWsUrl();
        console.log("[Classroom WS] Configured URL from ws-config:", configuredWsUrl || "(none)");
        
        if (closingRef.current) return;

        const urls = resolveWsCandidates(configuredWsUrl);
        console.log("[Classroom WS] URL candidates:", urls);
        
        if (!urls.length) {
          console.error("[Classroom WS] No WebSocket URLs available!");
          setStatus("error");
          setReady(false);
          return;
        }

        const normalizedIndex = Math.min(
          Math.max(Number(urlIndex) || 0, 0),
          urls.length - 1
        );
        const wsUrl = urls[normalizedIndex];
        console.log("[Classroom WS] Trying URL:", wsUrl, "(index:", normalizedIndex, ")");

        const wsToken = await getWsAuthToken();
        console.log("[Classroom WS] Auth token:", wsToken ? `obtained (${wsToken.substring(0, 20)}...)` : "MISSING!");
        
        if (closingRef.current) return;

        const ws = createWebSocket(wsUrl, wsToken);
        wsRef.current = ws;
        console.log("[Classroom WS] WebSocket created, waiting for connection...");

        if (typeof window !== "undefined") {
          window.__ws_classroom = ws;
        }

        let opened = false;
        let connectTimeoutId = null;

        const clearConnectTimeout = () => {
          if (connectTimeoutId) {
            clearTimeout(connectTimeoutId);
            connectTimeoutId = null;
          }
        };

        connectTimeoutId = setTimeout(() => {
          if (closingRef.current || opened) return;
          try {
            if (
              ws.readyState === WebSocket.CONNECTING ||
              ws.readyState === WebSocket.OPEN
            ) {
              ws.close();
            }
          } catch {
            // ignore
          }
        }, WS_CONNECT_TIMEOUT_MS);

        ws.onopen = () => {
          console.log("[Classroom WS] ✅ Connection opened successfully!");
          if (closingRef.current) return;
          clearConnectTimeout();

          opened = true;
          retryAttemptRef.current = 0;
          currentUrlIndexRef.current = normalizedIndex;
          setReady(true);
          setStatus("ready");

          console.log("[Classroom WS] Joining room:", roomId);
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

        ws.onerror = (err) => {
          console.error("[Classroom WS] ❌ Connection error!", err);
          if (closingRef.current) return;
          clearConnectTimeout();
          setReady(false);
          setStatus("error");
          stopHeartbeat();
        };

        ws.onclose = (e) => {
          console.warn("[Classroom WS] Connection closed. Code:", e?.code, "Reason:", e?.reason || "(none)");
          clearConnectTimeout();
          stopHeartbeat();
          setReady(false);

          if (closingRef.current) {
            console.log("[Classroom WS] Closed intentionally.");
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
      };

      void establishConnection();
    },
    [
      roomId,
      clearReconnectTimeout,
      startHeartbeat,
      stopHeartbeat,
      getConfiguredWsUrl,
      getWsAuthToken,
    ]
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
