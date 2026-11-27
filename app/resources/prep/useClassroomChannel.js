// app/resources/prep/useClassroomChannel.js
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import api from "@/lib/api";
import { isTrustedClassroomEvent } from "@/lib/classroomEventTrust.mjs";
import {
  chunkEventsForSend,
  enqueueOutboxEvent,
} from "@/lib/classroomChannelOutbox.mjs";
import { createSocketLiveness } from "@/lib/classroomSocketLiveness.mjs";

const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_RECONNECT_DELAY_MS = 30000;
const WS_TOKEN_REFRESH_SKEW_MS = 30000;
const WS_CONNECT_TIMEOUT_MS = 7000;
const WS_JOIN_TIMEOUT_MS = 10000;
const WS_SEND_BATCH_DELAY_MS = 16;
const WS_CONFIG_ENDPOINTS = ["/ws-config", "/api/ws-config"];
// The server rejects a single classroom message above 256 KB.
const WS_MAX_FRAME_BYTES = 200 * 1024;
// Join rejections that retrying cannot fix. Admission is retried by the
// classroom once the learner is admitted (retryNow).
const ADMISSION_REQUIRED_CODE = "classroom_admission_required";
const TERMINAL_JOIN_CODES = new Set([
  // A lock refuses late joiners until the teacher unlocks; retrying cannot help.
  "classroom_locked",
  "forbidden_classroom_room",
  "classroom_ended",
  "invalid_classroom_room",
  "missing_authenticated_user",
]);
const CLASSROOM_WS_DEBUG =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_CLASSROOM_WS_DEBUG === "1";

function debugClassroomWs(...args) {
  if (CLASSROOM_WS_DEBUG) {
    console.debug("[Classroom WS]", ...args);
  }
}

function sanitizeWsUrlForLog(value) {
  if (!value) return value;

  try {
    const url = new URL(value);
    url.searchParams.delete("token");
    return url.toString();
  } catch {
    return value;
  }
}

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

// The token travels as the WebSocket subprotocol, which the server reads
// first. It only goes in the URL (where proxies may log it) when the browser
// refuses it as a subprotocol.
function createWebSocket(wsUrl, token) {
  if (!token) {
    return new WebSocket(wsUrl);
  }

  try {
    return new WebSocket(wsUrl, [token]);
  } catch {
    return new WebSocket(appendWsToken(wsUrl, token));
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
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [reconnectFailed, setReconnectFailed] = useState(false);
  const [lastServerError, setLastServerError] = useState(null);

  const wsRef = useRef(null);
  const handlersRef = useRef([]);
  const retryAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const livenessRef = useRef(null);
  const sendBufferRef = useRef([]);
  const sendFlushTimeoutRef = useRef(null);
  const closingRef = useRef(false);
  // Events created before the server confirmed the room join.
  const outboxRef = useRef([]);
  const joinedRef = useRef(false);
  // Set when the server refused the join; stops the reconnect loop.
  const joinBlockedRef = useRef(null);
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
    livenessRef.current?.stop();
    livenessRef.current = null;
  }, []);

  // Pings the server and expects an answer. A socket that died without
  // closing (network change, sleep) is closed here and reconnected through
  // the normal onclose path, which then resyncs everything that listens.
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();

    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const liveness = createSocketLiveness({
      sendPing: () => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
      },
      onStale: (reason) => {
        if (wsRef.current !== ws) return;
        debugClassroomWs("Connection went quiet; reconnecting", reason);
        const handleClose = ws.onclose;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          ws.close(4000, "stale");
        } catch {
          // ignore
        }
        handleClose?.({ code: 4000, reason: "stale" });
      },
    });
    livenessRef.current = liveness;
    liveness.start();
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
      joinedRef.current = false;
      joinBlockedRef.current = null;
      setReconnectFailed(false);
      setStatus(retryAttemptRef.current > 0 ? "reconnecting" : "connecting");
      setReady(false);

      const establishConnection = async () => {
        debugClassroomWs("Starting connection", { roomId });

        const configuredWsUrl = await getConfiguredWsUrl();
        debugClassroomWs(
          "Configured URL from ws-config",
          sanitizeWsUrlForLog(configuredWsUrl) || "(none)"
        );

        if (closingRef.current) return;

        const urls = resolveWsCandidates(configuredWsUrl);
        debugClassroomWs("URL candidates", urls.map(sanitizeWsUrlForLog));

        if (!urls.length) {
          console.error("[Classroom WS] No WebSocket URLs available!");
          setStatus("closed");
          setReady(false);
          setReconnectFailed(true);
          return;
        }

        const normalizedIndex = Math.min(
          Math.max(Number(urlIndex) || 0, 0),
          urls.length - 1
        );
        const wsUrl = urls[normalizedIndex];
        debugClassroomWs("Trying URL", {
          url: sanitizeWsUrlForLog(wsUrl),
          index: normalizedIndex,
        });

        const wsToken = await getWsAuthToken();
        debugClassroomWs("Auth token status", wsToken ? "available" : "missing");

        if (closingRef.current) return;

        const ws = createWebSocket(wsUrl, wsToken);
        wsRef.current = ws;
        debugClassroomWs("WebSocket created, waiting for connection");

        if (CLASSROOM_WS_DEBUG && typeof window !== "undefined") {
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
          debugClassroomWs("Connection opened successfully");
          if (closingRef.current) return;
          clearConnectTimeout();

          opened = true;
          currentUrlIndexRef.current = normalizedIndex;
          // Not "ready" yet: the server authorises the join asynchronously
          // and drops anything sent before it answers "joined".
          setStatus("joining");

          // If the server never confirms the join (room full, server
          // restart mid-handshake), close so the normal reconnect runs.
          setTimeout(() => {
            if (closingRef.current || joinedRef.current || wsRef.current !== ws) return;
            if (joinBlockedRef.current) return;
            try { ws.close(); } catch { /* ignore */ }
          }, WS_JOIN_TIMEOUT_MS);

          debugClassroomWs("Joining room", { roomId });
          ws.send(
            JSON.stringify({
              type: "join",
              roomId: String(roomId),
            })
          );

          startHeartbeat();
        };

        ws.onmessage = (event) => {
          if (wsRef.current === ws) livenessRef.current?.heard(null);
          let msg;
          try {
            msg = JSON.parse(event.data);
          } catch {
            return;
          }

          if (msg?.type === "ping" || msg?.type === "pong") {
            if (msg.type === "pong" && wsRef.current === ws) livenessRef.current?.heard("pong");
            return;
          }

          if (msg?.type === "joined") {
            joinedRef.current = true;
            retryAttemptRef.current = 0;
            setReconnectAttempt(0);
            setReconnectFailed(false);
            setLastServerError(null);
            setReady(true);
            setStatus("ready");
            flushOutboxRef.current?.();
            return;
          }

          if (msg?.type === "error") {
            const code = typeof msg?.code === "string" ? msg.code : "";
            if (code === ADMISSION_REQUIRED_CODE || TERMINAL_JOIN_CODES.has(code)) {
              joinBlockedRef.current = code;
            }
            console.warn("Classroom WS server error", code || msg?.message || "unknown");
            setLastServerError({
              code: code || null,
              message: typeof msg?.message === "string" ? msg.message : "",
              at: Date.now(),
            });
            return;
          }

          if (
            msg.type === "signal" &&
            msg.signalType === "classroom-event" &&
            msg.data
          ) {
            const events =
              msg.data?.type === "BATCH" && Array.isArray(msg.data.events)
                ? msg.data.events
                : [msg.data];

            events.forEach((eventPayload) => {
              if (!isTrustedClassroomEvent(eventPayload)) {
                debugClassroomWs("Dropped untrusted event", eventPayload?.type);
                return;
              }
              handlersRef.current.forEach((fn) => {
                try {
                  fn(eventPayload);
                } catch (err) {
                  console.warn("Classroom handler error", err);
                }
              });
            });
          }
        };

        ws.onerror = (err) => {
          console.error("[Classroom WS] Connection error", err);
          if (closingRef.current) return;
          clearConnectTimeout();
          setReady(false);
          setStatus("error");
          stopHeartbeat();
        };

        ws.onclose = (e) => {
          debugClassroomWs("Connection closed", {
            code: e?.code,
            reason: e?.reason || "(none)",
          });
          clearConnectTimeout();
          stopHeartbeat();
          setReady(false);
          joinedRef.current = false;

          if (joinBlockedRef.current) {
            // Retrying cannot succeed until something changes (admission).
            // Reconnecting every second here hammered the server for as
            // long as a learner sat in the waiting room.
            setStatus(
              joinBlockedRef.current === ADMISSION_REQUIRED_CODE
                ? "awaiting_admission"
                : "forbidden"
            );
            return;
          }

          if (closingRef.current) {
            debugClassroomWs("Closed intentionally");
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
          setReconnectAttempt(attempt);

          if (attempt > MAX_RECONNECT_ATTEMPTS) {
            setStatus("closed");
            setReconnectFailed(true);
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

  const retryNow = useCallback(() => {
    if (!roomId || typeof window === "undefined") return;

    retryAttemptRef.current = 0;
    setReconnectAttempt(0);
    setReconnectFailed(false);
    joinBlockedRef.current = null;
    currentUrlIndexRef.current = 0;
    connect(0);
  }, [roomId, connect]);

  // Coming back online should reconnect now, not after the current backoff
  // (which grows up to 30 s).
  useEffect(() => {
    if (!roomId || typeof window === "undefined") return undefined;
    const handleOnline = () => {
      if (closingRef.current || joinBlockedRef.current) return;
      // Still "joined" may be a socket that died with the old network:
      // check it now instead of trusting it.
      if (joinedRef.current) {
        livenessRef.current?.probe();
        return;
      }
      retryNow();
    };
    // A laptop waking up or a tab coming back can hold a dead socket too.
    const handleVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (closingRef.current || joinBlockedRef.current) return;
      if (joinedRef.current) livenessRef.current?.probe();
    };
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [roomId, retryNow]);

  useEffect(() => {
    if (!roomId) {
      setReady(false);
      setStatus("idle");
      setReconnectAttempt(0);
      setReconnectFailed(false);
      return;
    }

    retryAttemptRef.current = 0;
    setReconnectAttempt(0);
    setReconnectFailed(false);
    currentUrlIndexRef.current = 0;
    connect(0);

    return () => {
      closingRef.current = true;

      clearReconnectTimeout();
      stopHeartbeat();
      if (sendFlushTimeoutRef.current) {
        clearTimeout(sendFlushTimeoutRef.current);
        sendFlushTimeoutRef.current = null;
      }
      sendBufferRef.current = [];

      const ws = wsRef.current;
      if (ws) {
        try {
          if (CLASSROOM_WS_DEBUG && window.__ws_classroom === ws) {
            delete window.__ws_classroom;
          }

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
      setReconnectAttempt(0);
      setReconnectFailed(false);
    };
  }, [roomId, connect, clearReconnectTimeout, stopHeartbeat]);

  const sendRaw = useCallback((payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      ws.send(
        JSON.stringify({
          type: "signal",
          signalType: "classroom-event",
          data: payload,
        })
      );
      return true;
    } catch (err) {
      console.warn("Failed to send classroom payload", err);
      return false;
    }
  }, []);

  const sendEvents = useCallback((events) => {
    // Keep every frame under the server's message size limit.
    for (const frame of chunkEventsForSend(events, WS_MAX_FRAME_BYTES)) {
      sendRaw(frame.length === 1 ? frame[0] : { type: "BATCH", events: frame });
    }
  }, [sendRaw]);

  const flushSendBuffer = useCallback(() => {
    sendFlushTimeoutRef.current = null;

    const events = sendBufferRef.current;
    sendBufferRef.current = [];
    if (!events.length) return;

    if (!joinedRef.current) {
      for (const event of events) {
        outboxRef.current = enqueueOutboxEvent(outboxRef.current, event);
      }
      return;
    }
    sendEvents(events);
  }, [sendEvents]);

  const flushOutboxRef = useRef(null);
  flushOutboxRef.current = () => {
    const queued = outboxRef.current;
    outboxRef.current = [];
    if (queued.length) sendEvents(queued);
  };

  const send = useCallback((payload) => {
    if (!payload || typeof payload !== "object") return;

    if (!joinedRef.current) {
      // Not joined yet (connecting, reconnecting, or the join is still being
      // authorised): keep what still matters and send it after "joined".
      outboxRef.current = enqueueOutboxEvent(outboxRef.current, payload);
      return;
    }

    sendBufferRef.current.push(payload);
    if (sendFlushTimeoutRef.current) return;

    sendFlushTimeoutRef.current = setTimeout(
      flushSendBuffer,
      WS_SEND_BATCH_DELAY_MS
    );
  }, [flushSendBuffer]);

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

  return useMemo(
    () => ({
      ready,
      send,
      subscribe,
      status,
      isReconnecting,
      reconnectAttempt,
      maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectFailed,
      retryNow,
      lastServerError,
    }),
    [
      ready,
      send,
      subscribe,
      status,
      isReconnecting,
      reconnectAttempt,
      reconnectFailed,
      retryNow,
      lastServerError,
    ]
  );
}
