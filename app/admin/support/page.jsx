"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import "@/styles/admin.scss";

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED"];

function niceCategory(cat) {
  if (!cat) return "";
  return String(cat)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSupportInboxPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const { user, checking } = useAuth();
  const isAdmin = user?.role === "admin";
  const router = useRouter();

  const [loadingList, setLoadingList] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("OPEN");

  const [tickets, setTickets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);

  const [reply, setReply] = useState("");
  const [error, setError] = useState(null);

  const bottomRef = useRef(null);

  useEffect(() => {
    if (checking) return;
    if (!user) router.push("/login");
    else if (!isAdmin) router.push("/dashboard");
  }, [checking, user, isAdmin, router]);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const listParams = useMemo(() => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (qDebounced) params.q = qDebounced;
    return params;
  }, [statusFilter, qDebounced]);

  async function loadTickets() {
    setLoadingList(true);
    setError(null);
    try {
      const { data } = await api.get("/support/admin/tickets", {
        params: { ...listParams, t: Date.now() },
        headers: { "Cache-Control": "no-store" },
      });

      const items = Array.isArray(data?.tickets) ? data.tickets : [];
      setTickets(items);

      if (!activeId && items.length > 0) {
        setActiveId(items[0].id);
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load tickets");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadTicket(id) {
    if (!id) return;
    setLoadingTicket(true);
    setError(null);
    try {
      const { data } = await api.get(`/support/admin/tickets/${id}`, {
        params: { t: Date.now() },
        headers: { "Cache-Control": "no-store" },
      });

      setActiveTicket(data?.ticket || null);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load ticket");
    } finally {
      setLoadingTicket(false);
    }
  }

  async function updateStatus(nextStatus) {
    if (!activeTicket?.id) return;
    setSavingStatus(true);
    setError(null);
    try {
      await api.patch(`/support/admin/tickets/${activeTicket.id}/status`, {
        status: nextStatus,
      });

      await loadTicket(activeTicket.id);
      await loadTickets();
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  }

  async function sendReply() {
    if (!activeTicket?.id) return;
    if (!reply.trim()) return;

    setSendingReply(true);
    setError(null);
    try {
      await api.post(`/support/admin/tickets/${activeTicket.id}/reply`, {
        message: reply.trim(),
      });

      setReply("");
      await loadTicket(activeTicket.id);
      await loadTickets();
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, statusFilter, qDebounced]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!activeId) return;
    loadTicket(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeId]);

  if (checking || !user || !isAdmin) return null;

  return (
    <main className="adm-admin-modern">
      <div className="adm-admin-header">
        <div>
          <h1 className="adm-admin-title">Support Inbox</h1>
          <p className="adm-admin-subtitle">
            View tickets • reply • change status
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="adm-filter"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subject / email / name / text…"
            className="adm-search"
          />

          <button
            className="adm-btn"
            onClick={loadTickets}
            disabled={loadingList}
          >
            {loadingList ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="adm-admin-card" style={{ marginBottom: 16 }}>
          <p style={{ color: "crimson", margin: 0 }}>{error}</p>
        </div>
      ) : null}

      <div
        className="adm-admin-card"
        style={{
          display: "grid",
          gridTemplateColumns: "420px 1fr",
          gap: 16,
          alignItems: "stretch",
          minHeight: "70vh",
        }}
      >
        {/* LEFT: Ticket list */}
        <div
          style={{
            borderRight: "1px solid rgba(0,0,0,0.06)",
            paddingRight: 16,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Tickets</h3>

          {loadingList ? (
            <p className="adm-muted">Loading…</p>
          ) : tickets.length === 0 ? (
            <p className="adm-muted">No tickets found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tickets.map((t) => {
                const isActive = t.id === activeId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className="adm-admin-card"
                    style={{
                      textAlign: "left",
                      cursor: "pointer",
                      padding: 12,
                      border: isActive
                        ? "2px solid rgba(59,130,246,0.7)"
                        : "1px solid rgba(0,0,0,0.06)",
                      background: isActive ? "rgba(59,130,246,0.06)" : "white",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <strong>{niceCategory(t.category)}</strong>
                      <span className="adm-muted">{t.status}</span>
                    </div>

                    <div className="adm-muted" style={{ marginTop: 6 }}>
                      {t.user?.email || `User #${t.userId}`}
                    </div>

                    {t.lastMessage?.body ? (
                      <div style={{ marginTop: 6, opacity: 0.9 }}>
                        {t.lastMessage.body.length > 90
                          ? t.lastMessage.body.slice(0, 90) + "…"
                          : t.lastMessage.body}
                      </div>
                    ) : null}

                    <div
                      className="adm-muted"
                      style={{ marginTop: 6, fontSize: 12 }}
                    >
                      {fmtTime(t.updatedAt || t.createdAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Ticket detail */}
        <div
          style={{ paddingLeft: 4, display: "flex", flexDirection: "column" }}
        >
          {!activeId ? (
            <p className="adm-muted">Select a ticket.</p>
          ) : loadingTicket || !activeTicket ? (
            <p className="adm-muted">Loading ticket…</p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3 style={{ margin: 0 }}>
                    {niceCategory(activeTicket.category)}
                  </h3>
                  <div className="adm-muted" style={{ marginTop: 6 }}>
                    From:{" "}
                    <strong>
                      {activeTicket.user?.email ||
                        `User #${activeTicket.userId}`}
                    </strong>
                  </div>
                  <div
                    className="adm-muted"
                    style={{ marginTop: 4, fontSize: 12 }}
                  >
                    Created: {fmtTime(activeTicket.createdAt)} • Updated:{" "}
                    {fmtTime(activeTicket.updatedAt)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className="adm-muted">Status</span>
                  <select
                    value={activeTicket.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    disabled={savingStatus}
                    className="adm-filter"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className="adm-admin-card"
                style={{
                  marginTop: 14,
                  flex: 1,
                  overflow: "auto",
                  padding: 14,
                  background: "rgba(255,255,255,0.9)",
                }}
              >
                {(activeTicket.messages || []).length === 0 ? (
                  <p className="adm-muted">No messages yet.</p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {(activeTicket.messages || []).map((m) => {
                      const isStaff = !!m.isStaff;
                      return (
                        <div
                          key={m.id}
                          style={{
                            maxWidth: "85%",
                            alignSelf: isStaff ? "flex-start" : "flex-end",
                            padding: "10px 12px",
                            borderRadius: 14,
                            border: "1px solid rgba(0,0,0,0.06)",
                            background: isStaff
                              ? "rgba(0,0,0,0.03)"
                              : "rgba(59,130,246,0.12)",
                          }}
                        >
                          <div style={{ fontSize: 12 }} className="adm-muted">
                            {isStaff ? "Support" : "User"} •{" "}
                            {fmtTime(m.createdAt)}
                          </div>

                          {m.body ? (
                            <div
                              style={{ marginTop: 6, whiteSpace: "pre-wrap" }}
                            >
                              {m.body}
                            </div>
                          ) : null}

                          {Array.isArray(m.attachments) &&
                          m.attachments.length > 0 ? (
                            <div
                              style={{
                                marginTop: 8,
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                              }}
                            >
                              {m.attachments.map((a) => (
                                <a
                                  key={a.id}
                                  href={`${API_BASE}/uploads/support/${a.filePath}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ textDecoration: "underline" }}
                                >
                                  {a.fileName || "Attachment"}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 10,
                  alignItems: "stretch",
                }}
              >
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply as admin…"
                  style={{
                    flex: 1,
                    minHeight: 46,
                    maxHeight: 140,
                    resize: "vertical",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                  }}
                />
                <button
                  className="adm-btn adm-btn--primary"
                  onClick={sendReply}
                  disabled={sendingReply || !reply.trim()}
                >
                  {sendingReply ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
