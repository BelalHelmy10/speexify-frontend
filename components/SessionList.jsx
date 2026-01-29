// components/SessionList.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import SessionCard from "./SessionCard";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";

/**
 * SessionList - Displays a list of sessions with filtering and pagination
 *
 * Props:
 * - userRole: "learner" | "teacher" | "admin"
 * - initialRange: "upcoming" | "past"
 * - limit: number of sessions to load
 * - showFilters: boolean
 * - locale: "en" | "ar"
 */
export default function SessionList({
  userRole = "learner",
  initialRange = "upcoming",
  limit = 10,
  showFilters = true,
  locale = "en",
  compact = false,
}) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState(initialRange);
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "ONE_ON_ONE" | "GROUP"

  const toast = useToast();

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const endpoint =
        userRole === "teacher" ? "/teacher/sessions" : "/me/sessions";

      const { data } = await api.get(endpoint, {
        params: { range, limit },
      });

      // Handle both array response and { sessions: [] } response
      const sessionsList = Array.isArray(data) ? data : data.sessions || data;
      setSessions(sessionsList);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setError(err?.response?.data?.error || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [userRole, range, limit]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Filter sessions by type
  const filteredSessions = sessions.filter((s) => {
    if (typeFilter === "all") return true;
    return s.type === typeFilter;
  });

  // Group sessions by date for better display
  const groupedSessions = filteredSessions.reduce((groups, session) => {
    const date = session.startAt
      ? new Date(session.startAt).toLocaleDateString(
        locale === "ar" ? "ar-EG" : "en-US",
        {
          weekday: "long",
          month: "long",
          day: "numeric",
          timeZone: user?.timezone,
        }
      )
      : "Unscheduled";

    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(session);
    return groups;
  }, {});

  // Handle cancel
  const handleCancel = async (session) => {
    if (!confirm(`Are you sure you want to cancel "${session.title}"?`)) {
      return;
    }

    try {
      await api.post(`/sessions/${session.id}/cancel`);
      toast?.success?.("Session canceled successfully");
      fetchSessions(); // Refresh list
    } catch (err) {
      console.error("Failed to cancel session:", err);
      toast?.error?.(err?.response?.data?.error || "Failed to cancel session");
    }
  };

  // Counts
  const counts = {
    all: sessions.length,
    ONE_ON_ONE: sessions.filter((s) => s.type === "ONE_ON_ONE").length,
    GROUP: sessions.filter((s) => s.type === "GROUP").length,
  };

  if (loading) {
    return (
      <div className="session-list session-list--loading">
        <div className="session-list__spinner" />
        <p>Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="session-list session-list--error">
        <p className="session-list__error-text">⚠️ {error}</p>
        <button
          type="button"
          className="session-list__retry-btn"
          onClick={fetchSessions}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="session-list">
      {/* Filters */}
      {showFilters && (
        <div className="session-list__filters">
          {/* Range filter */}
          <div className="session-list__filter-group">
            <button
              type="button"
              className={`session-list__filter-btn ${range === "upcoming" ? "session-list__filter-btn--active" : ""
                }`}
              onClick={() => setRange("upcoming")}
            >
              Upcoming
            </button>
            <button
              type="button"
              className={`session-list__filter-btn ${range === "past" ? "session-list__filter-btn--active" : ""
                }`}
              onClick={() => setRange("past")}
            >
              Past
            </button>
          </div>

          {/* Type filter */}
          <div className="session-list__filter-group">
            <button
              type="button"
              className={`session-list__filter-btn ${typeFilter === "all" ? "session-list__filter-btn--active" : ""
                }`}
              onClick={() => setTypeFilter("all")}
            >
              All ({counts.all})
            </button>
            <button
              type="button"
              className={`session-list__filter-btn ${typeFilter === "ONE_ON_ONE"
                  ? "session-list__filter-btn--active"
                  : ""
                }`}
              onClick={() => setTypeFilter("ONE_ON_ONE")}
            >
              👤 1:1 ({counts.ONE_ON_ONE})
            </button>
            <button
              type="button"
              className={`session-list__filter-btn ${typeFilter === "GROUP" ? "session-list__filter-btn--active" : ""
                }`}
              onClick={() => setTypeFilter("GROUP")}
            >
              👥 Group ({counts.GROUP})
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredSessions.length === 0 && (
        <div className="session-list__empty">
          <div className="session-list__empty-icon">📅</div>
          <h3 className="session-list__empty-title">
            No {range} sessions found
          </h3>
          <p className="session-list__empty-text">
            {range === "upcoming"
              ? "You don't have any upcoming sessions scheduled."
              : "No past sessions to show."}
          </p>
        </div>
      )}

      {/* Sessions grouped by date */}
      {Object.entries(groupedSessions).map(([date, dateSessions]) => (
        <div key={date} className="session-list__group">
          <h4 className="session-list__group-date">{date}</h4>
          <div className="session-list__cards">
            {dateSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                userRole={userRole}
                onCancel={handleCancel}
                locale={locale}
                timezone={user?.timezone}
                compact={compact}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
