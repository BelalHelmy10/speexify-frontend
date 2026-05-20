// app/classroom/[sessionId]/useClassroomLobby.js
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";

const LOBBY_POLL_INTERVAL_MS = 4000;
const LOBBY_STATUS_POLL_INTERVAL_MS = 3000;

/**
 * Hook for classroom lobby / waiting room logic.
 *
 * For TEACHERS: polls the waiting list and provides admit/deny actions.
 * For LEARNERS: joins the lobby, polls admission status, listens for WS events.
 *
 * @param {Object} options
 * @param {string} options.sessionId
 * @param {boolean} options.isTeacher
 * @param {Object} options.classroomChannel - { ready, send, subscribe }
 * @param {string} options.userName - learner display name
 * @returns lobby state and actions
 */
export function useClassroomLobby({
  sessionId,
  isTeacher = false,
  classroomChannel,
  userName = "Learner",
}) {
  // Shared state
  const [lobbyEnabled, setLobbyEnabled] = useState(null); // null = unknown
  const [lobbyStatus, setLobbyStatus] = useState("checking"); // "checking" | "admitted" | "waiting" | "denied" | "not_joined"

  // Teacher state
  const [waitingLearners, setWaitingLearners] = useState([]);
  const [isLobbyPanelOpen, setIsLobbyPanelOpen] = useState(false);

  // Refs to prevent stale closures
  const sessionIdRef = useRef(sessionId);
  const mountedRef = useRef(true);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ─── Initial lobby status check (both teacher & learner) ───
  useEffect(() => {
    if (!sessionId) {
      setLobbyStatus("admitted");
      setLobbyEnabled(false);
      return;
    }

    let cancelled = false;

    async function checkStatus() {
      try {
        const { data } = await api.get(`/sessions/${sessionId}/lobby/status`);
        if (cancelled) return;

        if (data.lobbyEnabled === false) {
          setLobbyEnabled(false);
          setLobbyStatus("admitted");
        } else {
          setLobbyEnabled(true);
          setLobbyStatus(data.status || "not_joined");
        }
      } catch (err) {
        console.warn("Failed to check lobby status:", err);
        if (!cancelled) {
          // On error, assume no lobby (graceful degradation)
          setLobbyStatus("admitted");
          setLobbyEnabled(false);
        }
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // ─── Learner: join lobby automatically when status is "not_joined" ───
  useEffect(() => {
    if (isTeacher || lobbyStatus !== "not_joined" || !lobbyEnabled) return;

    let cancelled = false;

    async function joinLobby() {
      try {
        const { data } = await api.post(`/sessions/${sessionId}/lobby/join`, {
          name: userName,
        });
        if (cancelled) return;

        setLobbyStatus(data.status || "waiting");

        // Notify teacher via WS
        if (classroomChannel?.ready && classroomChannel?.send) {
          classroomChannel.send({
            type: "LOBBY_JOIN",
            name: userName,
            sessionId,
            at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn("Failed to join lobby:", err);
        if (!cancelled) {
          // If error has denied status
          if (err?.response?.data?.status === "denied") {
            setLobbyStatus("denied");
          } else {
            // Graceful: just let them through
            setLobbyStatus("admitted");
          }
        }
      }
    }

    joinLobby();
    return () => {
      cancelled = true;
    };
  }, [isTeacher, lobbyStatus, lobbyEnabled, sessionId, userName, classroomChannel]);

  // ─── Learner: poll status while waiting ───
  useEffect(() => {
    if (isTeacher || lobbyStatus !== "waiting") return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/sessions/${sessionId}/lobby/status`);
        if (!mountedRef.current) return;

        if (data.status === "admitted") {
          setLobbyStatus("admitted");
        }
      } catch {
        // Ignore polling errors
      }
    }, LOBBY_STATUS_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isTeacher, lobbyStatus, sessionId]);

  // ─── Learner: listen for WS admission events ───
  useEffect(() => {
    if (isTeacher || !classroomChannel?.subscribe) return;

    const unsubscribe = classroomChannel.subscribe((msg) => {
      const data = msg?.data || msg;
      if (!data?.type) return;

      if (data.type === "LOBBY_ADMITTED") {
        setLobbyStatus("admitted");
      } else if (data.type === "LOBBY_DENIED") {
        setLobbyStatus("denied");
      } else if (data.type === "LOBBY_ADMIT_ALL") {
        setLobbyStatus("admitted");
      }
    });

    return unsubscribe;
  }, [isTeacher, classroomChannel]);

  // ─── Teacher: poll waiting list ───
  useEffect(() => {
    if (!isTeacher || !sessionId) return;

    let cancelled = false;

    async function fetchWaiting() {
      try {
        const { data } = await api.get(`/sessions/${sessionId}/lobby`);
        if (cancelled) return;
        setWaitingLearners(data.waiting || []);
      } catch {
        // Ignore
      }
    }

    fetchWaiting();
    const interval = setInterval(fetchWaiting, LOBBY_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isTeacher, sessionId]);

  // ─── Teacher: listen for WS lobby join events ───
  useEffect(() => {
    if (!isTeacher || !classroomChannel?.subscribe) return;

    const unsubscribe = classroomChannel.subscribe((msg) => {
      const data = msg?.data || msg;
      if (!data?.type) return;

      if (data.type === "LOBBY_JOIN") {
        // Refresh the waiting list
        api
          .get(`/sessions/${sessionId}/lobby`)
          .then(({ data: res }) => {
            if (mountedRef.current) {
              setWaitingLearners(res.waiting || []);
            }
          })
          .catch(() => {});
      }
    });

    return unsubscribe;
  }, [isTeacher, classroomChannel, sessionId]);

  // ─── Teacher actions ───
  const admitLearner = useCallback(
    async (learnerId) => {
      try {
        const { data } = await api.post(`/sessions/${sessionId}/lobby/admit`, {
          learnerId,
        });
        setWaitingLearners(data.waiting || []);

        // Notify the learner via WS
        if (classroomChannel?.ready && classroomChannel?.send) {
          classroomChannel.send({
            type: "LOBBY_ADMITTED",
            learnerId,
            sessionId,
            at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Failed to admit learner:", err);
      }
    },
    [sessionId, classroomChannel]
  );

  const denyLearner = useCallback(
    async (learnerId) => {
      try {
        const { data } = await api.post(`/sessions/${sessionId}/lobby/deny`, {
          learnerId,
        });
        setWaitingLearners(data.waiting || []);

        // Notify the learner via WS
        if (classroomChannel?.ready && classroomChannel?.send) {
          classroomChannel.send({
            type: "LOBBY_DENIED",
            learnerId,
            sessionId,
            at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Failed to deny learner:", err);
      }
    },
    [sessionId, classroomChannel]
  );

  const admitAll = useCallback(async () => {
    try {
      const { data } = await api.post(
        `/sessions/${sessionId}/lobby/admit-all`
      );
      setWaitingLearners([]);

      // Broadcast to all waiting learners via WS
      if (classroomChannel?.ready && classroomChannel?.send) {
        classroomChannel.send({
          type: "LOBBY_ADMIT_ALL",
          sessionId,
          admittedIds: data.admittedIds || [],
          at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Failed to admit all learners:", err);
    }
  }, [sessionId, classroomChannel]);

  const toggleLobby = useCallback(
    async (enabled) => {
      try {
        await api.post(`/sessions/${sessionId}/lobby/toggle`, { enabled });
        setLobbyEnabled(enabled);
      } catch (err) {
        console.error("Failed to toggle lobby:", err);
      }
    },
    [sessionId]
  );

  const retryJoin = useCallback(() => {
    setLobbyStatus("not_joined");
  }, []);

  const togglePanel = useCallback(() => {
    setIsLobbyPanelOpen((prev) => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setIsLobbyPanelOpen(false);
  }, []);

  return {
    // State
    lobbyEnabled,
    lobbyStatus,
    waitingLearners,
    isLobbyPanelOpen,

    // Computed
    isInWaitingRoom: !isTeacher && lobbyEnabled && lobbyStatus === "waiting",
    isDenied: !isTeacher && lobbyStatus === "denied",
    isAdmitted: lobbyStatus === "admitted" || !lobbyEnabled,
    hasWaitingLearners: isTeacher && waitingLearners.length > 0,

    // Teacher actions
    admitLearner,
    denyLearner,
    admitAll,
    toggleLobby,
    togglePanel,
    closePanel,

    // Learner actions
    retryJoin,
  };
}
