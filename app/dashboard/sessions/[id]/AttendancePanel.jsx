// app/dashboard/sessions/[id]/AttendancePanel.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  UserRound,
  X,
} from "lucide-react";
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
  const toast = useToast();
  const [localParticipants, setLocalParticipants] = useState(participants);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when prop changes
  useEffect(() => {
    setLocalParticipants(participants);
    setHasChanges(false);
  }, [participants]);

  // Check if session has started
  const sessionStarted = new Date(sessionStartAt) <= new Date();
  const canMarkAttendance =
    isTeacher && sessionStarted && sessionStatus !== "canceled";

  // Handle status change for a participant
  const handleStatusChange = useCallback((userId, newStatus) => {
    setLocalParticipants((prev) =>
      prev.map((p) =>
        p.userId === userId || p.user?.id === userId
          ? { ...p, status: newStatus }
          : p
      )
    );
    setHasChanges(true);
  }, []);

  // Mark all as attended
  const markAllAttended = useCallback(() => {
    setLocalParticipants((prev) =>
      prev.map((p) =>
        p.status !== "canceled" ? { ...p, status: "attended" } : p
      )
    );
    setHasChanges(true);
  }, []);

  // Save attendance
  const saveAttendance = async () => {
    if (!hasChanges || saving) return;

    try {
      setSaving(true);

      const attendanceData = localParticipants
        .filter((p) => p.status !== "canceled")
        .map((p) => ({
          userId: p.userId || p.user?.id,
          status: p.status,
        }));

      await api.post(`/sessions/${sessionId}/attendance`, {
        participants: attendanceData,
      });

      toast?.success?.("Attendance saved successfully");
      setHasChanges(false);

      if (typeof onUpdate === "function") {
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to save attendance:", err);
      toast?.error?.(err?.response?.data?.error || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // Status options
  const statusOptions = [
    { value: "booked", label: "Enrolled", Icon: UserRound, color: "#64748b" },
    { value: "attended", label: "Attended", Icon: Check, color: "#0f9f7a" },
    { value: "no_show", label: "No show", Icon: X, color: "#d94b4b" },
    { value: "excused", label: "Excused", Icon: AlertTriangle, color: "#b7791f" },
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
        <h3 className="attendance-panel__title">
          <ClipboardCheck size={18} aria-hidden />
          Attendance
        </h3>
        <div className="attendance-panel__list">
          {activeParticipants.map((p) => {
            const config = getStatusConfig(p.status);
            const Icon = config.Icon;
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
                  <Icon size={15} aria-hidden />
                  {config.label}
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
        <h3 className="attendance-panel__title">
          <ClipboardCheck size={18} aria-hidden />
          Mark attendance
        </h3>
        {canMarkAttendance && activeParticipants.length > 1 && (
          <button
            type="button"
            className="attendance-panel__mark-all"
            onClick={markAllAttended}
            disabled={saving}
          >
            <CheckCircle2 size={15} aria-hidden />
            Mark all attended
          </button>
        )}
      </div>

      {!sessionStarted && (
        <div className="attendance-panel__notice">
          <AlertTriangle size={16} aria-hidden />
          Attendance can be marked once the session starts.
        </div>
      )}

      {sessionStatus === "canceled" && (
        <div className="attendance-panel__notice attendance-panel__notice--warning">
          <AlertTriangle size={16} aria-hidden />
          This session has been canceled.
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
            const StatusIcon = config.Icon;

            return (
              <div key={userId} className="attendance-panel__item">
                <div className="attendance-panel__participant">
                  <span className="attendance-panel__avatar" aria-hidden>
                    <UserRound size={17} />
                  </span>
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
                      .map((opt) => {
                        const Icon = opt.Icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            className={`attendance-panel__btn ${
                              currentStatus === opt.value
                                ? "attendance-panel__btn--active"
                                : ""
                            }`}
                            style={{ "--btn-color": opt.color }}
                            onClick={() => handleStatusChange(userId, opt.value)}
                            disabled={saving}
                            title={opt.label}
                          >
                            <Icon size={15} aria-hidden />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <span
                    className="attendance-panel__status-badge"
                    style={{ color: config.color }}
                  >
                    <StatusIcon size={15} aria-hidden />
                    {config.label}
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
              <span className="attendance-panel__status-badge">
                <X size={15} aria-hidden />
                Canceled
              </span>
            </div>
          ))}
        </div>
      )}

      {canMarkAttendance && hasChanges && (
        <div className="attendance-panel__actions">
          <button
            type="button"
            className="attendance-panel__save"
            onClick={saveAttendance}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      )}
    </div>
  );
}
