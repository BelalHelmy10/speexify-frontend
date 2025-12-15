// components/admin/AdminSessionList.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import AdminSessionForm from "./AdminSessionForm";

/**
 * AdminSessionList - Full session management for admins
 */
export default function AdminSessionList() {
  const toast = useToast();

  // Sessions data
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [range, setRange] = useState("upcoming");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [showParticipants, setShowParticipants] = useState(null);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data } = await api.get("/admin/sessions", {
        params: {
          range,
          type: typeFilter || undefined,
          q: searchQuery || undefined,
          limit,
          offset,
        },
      });

      setSessions(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to load sessions:", err);
      setError(err?.response?.data?.error || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [range, typeFilter, searchQuery, offset]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Actions
  const handleCreate = () => {
    setEditingSession(null);
    setShowForm(true);
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSession(null);
    fetchSessions();
  };

  const handleDelete = async (session) => {
    if (
      !confirm(
        `Are you sure you want to DELETE session "${session.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/admin/sessions/${session.id}`);
      toast?.success?.("Session deleted");
      fetchSessions();
    } catch (err) {
      console.error("Failed to delete session:", err);
      toast?.error?.(err?.response?.data?.error || "Failed to delete session");
    }
  };

  const handleCancel = async (session) => {
    if (
      !confirm(
        `Cancel session "${session.title}"? Refunds will be processed if applicable.`
      )
    ) {
      return;
    }

    try {
      await api.post(`/sessions/${session.id}/cancel`);
      toast?.success?.("Session canceled");
      fetchSessions();
    } catch (err) {
      console.error("Failed to cancel session:", err);
      toast?.error?.(err?.response?.data?.error || "Failed to cancel session");
    }
  };

  const handleComplete = async (session) => {
    if (
      !confirm(
        `Mark "${session.title}" as completed? Credits will be consumed.`
      )
    ) {
      return;
    }

    try {
      await api.post(`/sessions/${session.id}/complete`);
      toast?.success?.("Session completed");
      fetchSessions();
    } catch (err) {
      console.error("Failed to complete session:", err);
      toast?.error?.(
        err?.response?.data?.error || "Failed to complete session"
      );
    }
  };

  // Participant management
  const handleRemoveParticipant = async (sessionId, userId, learnerName) => {
    const refund = confirm(
      `Remove ${learnerName} from session? Click OK to refund their credit, Cancel to remove without refund.`
    );

    try {
      await api.delete(`/admin/sessions/${sessionId}/participants/${userId}`, {
        params: { refund: refund ? "1" : "0" },
      });
      toast?.success?.(`${learnerName} removed from session`);
      fetchSessions();
      setShowParticipants(null);
    } catch (err) {
      console.error("Failed to remove participant:", err);
      toast?.error?.(
        err?.response?.data?.error || "Failed to remove participant"
      );
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Pagination
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="admin-sessions">
      {/* Header */}
      <div className="admin-sessions__header">
        <h1 className="admin-sessions__title">Sessions Management</h1>
        <button
          type="button"
          className="admin-sessions__create-btn"
          onClick={handleCreate}
        >
          + Create Session
        </button>
      </div>

      {/* Filters */}
      <div className="admin-sessions__filters">
        <div className="admin-sessions__filter-group">
          <select
            className="admin-sessions__select"
            value={range}
            onChange={(e) => {
              setRange(e.target.value);
              setOffset(0);
            }}
          >
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="">All</option>
          </select>

          <select
            className="admin-sessions__select"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All Types</option>
            <option value="ONE_ON_ONE">1:1 Only</option>
            <option value="GROUP">Group Only</option>
          </select>
        </div>

        <input
          type="text"
          className="admin-sessions__search"
          placeholder="Search by title..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setOffset(0);
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="admin-sessions__error">
          <p>{error}</p>
          <button onClick={fetchSessions}>Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="admin-sessions__loading">
          <p>Loading sessions...</p>
        </div>
      )}

      {/* Sessions Table */}
      {!loading && !error && (
        <>
          <div className="admin-sessions__table-wrapper">
            <table className="admin-sessions__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Date/Time</th>
                  <th>Teacher</th>
                  <th>Participants</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="admin-sessions__empty">
                      No sessions found
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr
                      key={session.id}
                      className={`admin-sessions__row admin-sessions__row--${session.status}`}
                    >
                      <td className="admin-sessions__cell--id">{session.id}</td>
                      <td className="admin-sessions__cell--title">
                        {session.title}
                      </td>
                      <td className="admin-sessions__cell--type">
                        {session.type === "GROUP" ? (
                          <span className="admin-sessions__badge admin-sessions__badge--group">
                            👥 GROUP
                          </span>
                        ) : (
                          <span className="admin-sessions__badge admin-sessions__badge--one-on-one">
                            👤 1:1
                          </span>
                        )}
                      </td>
                      <td className="admin-sessions__cell--date">
                        {formatDate(session.startAt)}
                      </td>
                      <td className="admin-sessions__cell--teacher">
                        {session.teacher?.name || session.teacher?.email || "-"}
                      </td>
                      <td className="admin-sessions__cell--participants">
                        <button
                          type="button"
                          className="admin-sessions__participants-btn"
                          onClick={() => setShowParticipants(session)}
                        >
                          {session.participantCount || 0}
                          {session.capacity && `/${session.capacity}`}
                          <span className="admin-sessions__participants-icon">
                            👁
                          </span>
                        </button>
                      </td>
                      <td className="admin-sessions__cell--status">
                        <span
                          className={`admin-sessions__status admin-sessions__status--${session.status}`}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td className="admin-sessions__cell--actions">
                        <div className="admin-sessions__actions">
                          <button
                            type="button"
                            className="admin-sessions__action-btn"
                            onClick={() => handleEdit(session)}
                            title="Edit"
                          >
                            ✏️
                          </button>

                          {session.status === "scheduled" && (
                            <>
                              <button
                                type="button"
                                className="admin-sessions__action-btn admin-sessions__action-btn--success"
                                onClick={() => handleComplete(session)}
                                title="Mark Complete"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                className="admin-sessions__action-btn admin-sessions__action-btn--warning"
                                onClick={() => handleCancel(session)}
                                title="Cancel"
                              >
                                ✗
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            className="admin-sessions__action-btn admin-sessions__action-btn--danger"
                            onClick={() => handleDelete(session)}
                            title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="admin-sessions__pagination">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setOffset((currentPage - 2) * limit)}
              >
                ← Previous
              </button>
              <span>
                Page {currentPage} of {totalPages} ({total} total)
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setOffset(currentPage * limit)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div
          className="admin-sessions__modal-overlay"
          onClick={() => setShowForm(false)}
        >
          <div
            className="admin-sessions__modal admin-sessions__modal--large"
            onClick={(e) => e.stopPropagation()}
          >
            <AdminSessionForm
              session={editingSession}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipants && (
        <div
          className="admin-sessions__modal-overlay"
          onClick={() => setShowParticipants(null)}
        >
          <div
            className="admin-sessions__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-sessions__modal-header">
              <h2>
                Participants: {showParticipants.title}
                {showParticipants.type === "GROUP" && (
                  <span className="admin-sessions__modal-capacity">
                    ({showParticipants.participantCount || 0}/
                    {showParticipants.capacity || "∞"})
                  </span>
                )}
              </h2>
              <button
                type="button"
                className="admin-sessions__modal-close"
                onClick={() => setShowParticipants(null)}
              >
                ✕
              </button>
            </div>

            <div className="admin-sessions__participants-list">
              {(!showParticipants.learners ||
                showParticipants.learners.length === 0) && (
                <p className="admin-sessions__no-participants">
                  No participants enrolled
                </p>
              )}

              {showParticipants.learners?.map((learner) => (
                <div
                  key={learner.id}
                  className={`admin-sessions__participant ${
                    learner.status === "canceled"
                      ? "admin-sessions__participant--canceled"
                      : ""
                  }`}
                >
                  <div className="admin-sessions__participant-info">
                    <span className="admin-sessions__participant-name">
                      {learner.name || "No name"}
                    </span>
                    <span className="admin-sessions__participant-email">
                      {learner.email}
                    </span>
                    <span
                      className={`admin-sessions__participant-status admin-sessions__participant-status--${learner.status}`}
                    >
                      {learner.status}
                    </span>
                  </div>

                  {showParticipants.status === "scheduled" &&
                    learner.status !== "canceled" && (
                      <button
                        type="button"
                        className="admin-sessions__participant-remove"
                        onClick={() =>
                          handleRemoveParticipant(
                            showParticipants.id,
                            learner.id,
                            learner.name || learner.email
                          )
                        }
                      >
                        Remove
                      </button>
                    )}
                </div>
              ))}
            </div>

            {/* Add participant button for GROUP sessions */}
            {showParticipants.type === "GROUP" &&
              showParticipants.status === "scheduled" && (
                <div className="admin-sessions__add-participant">
                  <button
                    type="button"
                    className="admin-sessions__add-participant-btn"
                    onClick={() => {
                      setEditingSession(showParticipants);
                      setShowParticipants(null);
                      setShowForm(true);
                    }}
                  >
                    + Add Participants
                  </button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
