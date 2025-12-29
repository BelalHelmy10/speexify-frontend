// app/dashboard/sessions/[id]/AttendancePanel.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";

/**
 * AttendancePanel - Allows teachers to mark attendance for session participants
 *
 * Props:
 * - sessionId: number
 * - participants: Array<{ userId, status, attendedAt, user: { id, name, email } }>
 * - isTeacher: boolean
 * - sessionStatus: string
 * - sessionStartAt: string (ISO date)
 * - onUpdate: () => void - callback to refresh parent data
 */
export default function AttendancePanel({
  sessionId,
  participants = [],
  isTeacher,
  sessionStatus,
  sessionStartAt,
  onUpdate,
}) {
  const { toast } = useToast();
  const [localParticipants, setLocalParticipants] = useState(participants);
  const [saving, setSaving] = useState(null); // Track which participant is being saved

  // Sync local state when prop changes
  useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);

  // Check if session has started
  const sessionStarted = new Date(sessionStartAt) <= new Date();
  const canMarkAttendance =
    isTeacher && sessionStarted && sessionStatus !== "canceled";

  // ✅ FIXED: Handle status change with IMMEDIATE save
  const handleStatusChange = useCallback(
    async (userId, newStatus) => {
      // Optimistic update - update UI immediately
      setLocalParticipants((prev) =>
        prev.map((p) =>
          p.userId === userId || p.user?.id === userId
            ? { ...p, status: newStatus, attendedAt: new Date().toISOString() }
            : p
        )
      );

      try {
        setSaving(userId);

        // Save to backend
        await api.post(`/sessions/${sessionId}/attendance`, {
          participants: [
            {
              userId,
              status: newStatus,
            },
          ],
        });

        toast?.success?.(
          `Marked as ${
            newStatus === "attended"
              ? "attended"
              : newStatus === "no_show"
              ? "no show"
              : "excused"
          }`
        );

        // ✅ KEY FIX: Refresh data from server
        if (typeof onUpdate === "function") {
          onUpdate();
        }
      } catch (err) {
        console.error("Failed to save attendance:", err);
        toast?.error?.(
          err?.response?.data?.error || "Failed to save attendance"
        );

        // Revert optimistic update on error
        setLocalParticipants(participants);
      } finally {
        setSaving(null);
      }
    },
    [sessionId, participants, toast, onUpdate]
  );

  // Mark all as attended
  const markAllAttended = useCallback(async () => {
    const activeUserIds = localParticipants
      .filter((p) => p.status !== "canceled")
      .map((p) => p.userId || p.user?.id);

    // Optimistic update
    setLocalParticipants((prev) =>
      prev.map((p) =>
        p.status !== "canceled"
          ? { ...p, status: "attended", attendedAt: new Date().toISOString() }
          : p
      )
    );

    try {
      setSaving("all");

      await api.post(`/sessions/${sessionId}/attendance`, {
        participants: activeUserIds.map((userId) => ({
          userId,
          status: "attended",
        })),
      });

      toast?.success?.("All marked as attended");

      // Refresh from server
      if (typeof onUpdate === "function") {
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to mark all attended:", err);
      toast?.error?.(
        err?.response?.data?.error || "Failed to mark all attended"
      );

      // Revert on error
      setLocalParticipants(participants);
    } finally {
      setSaving(null);
    }
  }, [localParticipants, sessionId, participants, toast, onUpdate]);

  // Status options
  const statusOptions = [
    { value: "booked", label: "Enrolled", icon: "📋", color: "#6b7280" },
    { value: "attended", label: "Attended", icon: "✓", color: "#10b981" },
    { value: "no_show", label: "No Show", icon: "✗", color: "#ef4444" },
    { value: "excused", label: "Excused", icon: "⚠", color: "#f59e0b" },
  ];

  const getStatusConfig = (status) =>
    statusOptions.find((o) => o.value === status) || statusOptions[0];

  // Filter out canceled participants for display
  const activeParticipants = localParticipants.filter(
    (p) => p.status !== "canceled"
  );
  const canceledParticipants = localParticipants.filter(
    (p) => p.status === "canceled"
  );

  if (!isTeacher) {
    // Read-only view for learners
    return (
      <div className="attendance-panel attendance-panel--readonly">
        <h3 className="attendance-panel__title">📋 Attendance</h3>
        <div className="attendance-panel__list">
          {activeParticipants.map((p) => {
            const config = getStatusConfig(p.status);
            return (
              <div
                key={p.userId || p.user?.id}
                className="attendance-panel__item"
              >
                <span className="attendance-panel__name">
                  {p.user?.name || p.user?.email || "Participant"}
                </span>
                <span
                  className="attendance-panel__status"
                  style={{ color: config.color }}
                >
                  {config.icon} {config.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-panel">
      <div className="attendance-panel__header">
        <h3 className="attendance-panel__title">📋 Mark Attendance</h3>
        {canMarkAttendance && activeParticipants.length > 1 && (
          <button
            type="button"
            className="attendance-panel__mark-all"
            onClick={markAllAttended}
            disabled={saving === "all"}
          >
            {saving === "all" ? "Saving..." : "✓ Mark All Attended"}
          </button>
        )}
      </div>

      {!sessionStarted && (
        <div className="attendance-panel__notice">
          ⏰ Attendance can be marked once the session starts.
        </div>
      )}

      {sessionStatus === "canceled" && (
        <div className="attendance-panel__notice attendance-panel__notice--warning">
          ⚠ This session has been canceled.
        </div>
      )}

      <div className="attendance-panel__list">
        {activeParticipants.length === 0 ? (
          <div className="attendance-panel__empty">
            No participants enrolled in this session.
          </div>
        ) : (
          activeParticipants.map((p) => {
            const userId = p.userId || p.user?.id;
            const currentStatus = p.status;
            const config = getStatusConfig(currentStatus);
            const isSaving = saving === userId;

            return (
              <div key={userId} className="attendance-panel__item">
                <div className="attendance-panel__participant">
                  <span className="attendance-panel__avatar">👤</span>
                  <div className="attendance-panel__info">
                    <span className="attendance-panel__name">
                      {p.user?.name || p.user?.email || "Participant"}
                    </span>
                    {p.attendedAt && (
                      <span className="attendance-panel__time">
                        Marked at {new Date(p.attendedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {canMarkAttendance ? (
                  <div className="attendance-panel__controls">
                    {statusOptions
                      .filter((opt) => opt.value !== "booked")
                      .map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`attendance-panel__btn ${
                            currentStatus === opt.value
                              ? "attendance-panel__btn--active"
                              : ""
                          }`}
                          style={{
                            "--btn-color": opt.color,
                            borderColor:
                              currentStatus === opt.value
                                ? opt.color
                                : undefined,
                            backgroundColor:
                              currentStatus === opt.value
                                ? `${opt.color}15`
                                : undefined,
                          }}
                          onClick={() => handleStatusChange(userId, opt.value)}
                          disabled={isSaving}
                          title={opt.label}
                        >
                          {isSaving ? "..." : opt.icon}
                        </button>
                      ))}
                  </div>
                ) : (
                  <span
                    className="attendance-panel__status-badge"
                    style={{ color: config.color }}
                  >
                    {config.icon} {config.label}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {canceledParticipants.length > 0 && (
        <div className="attendance-panel__canceled">
          <h4 className="attendance-panel__canceled-title">
            Canceled ({canceledParticipants.length})
          </h4>
          {canceledParticipants.map((p) => (
            <div
              key={p.userId || p.user?.id}
              className="attendance-panel__item attendance-panel__item--canceled"
            >
              <span className="attendance-panel__name">
                {p.user?.name || p.user?.email || "Participant"}
              </span>
              <span className="attendance-panel__status-badge">✗ Canceled</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
