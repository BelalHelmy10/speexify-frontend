// components/SupportWidget.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { MessageCircle, X, Send, Loader2, ArrowLeft } from "lucide-react";
import {
  listSupportTickets,
  getSupportTicket,
  createSupportTicket,
  replyToSupportTicket,
  uploadSupportAttachment,
} from "@/lib/supportApi";
import "@/styles/support-widget.scss";

const CATEGORIES = [
  { key: "PAYMENT", label: "Payment issue" },
  { key: "BOOKING", label: "Booking / scheduling" },
  { key: "CLASSROOM_TECH", label: "Classroom / audio / video" },
  { key: "ACCOUNT", label: "Account" },
  { key: "OTHER", label: "Other" },
];

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [view, setView] = useState("home"); // home | list

  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  // Load tickets when widget opens
  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError(null);

    listSupportTickets()
      .then((res) => {
        const t = res?.tickets || [];
        setTickets(t);
        // Default to "home" screen; user can choose "My conversations"
        setView("home");
      })
      .catch(() => {
        // If unauthenticated or API error, just keep UI usable
      })
      .finally(() => setLoading(false));
  }, [open]);

  async function loadTicket(id) {
    setLoading(true);
    setError(null);
    try {
      const res = await getSupportTicket(id);
      setActiveTicket(res.ticket);
      setView("home");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (activeTicket) {
        await replyToSupportTicket({
          ticketId: activeTicket.id,
          message,
        });

        // Reload ticket so you always see the latest server truth
        await loadTicket(activeTicket.id);
      } else {
        const res = await createSupportTicket({
          category,
          message,
        });

        // Refresh list + open created ticket
        const list = await listSupportTickets().catch(() => null);
        if (list?.tickets) setTickets(list.tickets);

        await loadTicket(res.ticket.id);
      }

      setMessage("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file || !activeTicket) return;

    setLoading(true);
    setError(null);

    try {
      const res = await uploadSupportAttachment({
        ticketId: activeTicket.id,
        file,
      });

      // Append the returned message immediately for snappy UI
      setActiveTicket((prev) => ({
        ...prev,
        messages: [...(prev?.messages || []), res.message],
      }));

      // Refresh list (so preview/lastMessage stays current, if your API provides it)
      const list = await listSupportTickets().catch(() => null);
      if (list?.tickets) setTickets(list.tickets);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  function reset() {
    setActiveTicket(null);
    setCategory(null);
    setMessage("");
    setError(null);
    setView("home");
  }

  const showBack = activeTicket || category || view === "list";

  return (
    <>
      <button
        className="support-widget__fab"
        onClick={() => setOpen(true)}
        aria-label="Contact support"
      >
        <MessageCircle size={22} />
      </button>

      {open && (
        <div className="support-widget__panel">
          <header className="support-widget__header">
            {showBack ? (
              <button onClick={reset} className="support-widget__back">
                <ArrowLeft size={18} />
              </button>
            ) : null}

            <span>Support</span>

            <button onClick={() => setOpen(false)} aria-label="Close support">
              <X size={18} />
            </button>
          </header>

          <div className="support-widget__body">
            {loading ? (
              <p className="support-widget__sub">Loading…</p>
            ) : activeTicket ? (
              <>
                <div className="support-widget__messages">
                  {(activeTicket.messages || []).map((m) => (
                    <div
                      key={m.id}
                      className={
                        m.authorId === activeTicket.userId
                          ? "support-widget__msg support-widget__msg--user"
                          : "support-widget__msg support-widget__msg--staff"
                      }
                    >
                      {m.attachments?.length
                        ? m.attachments.map((a) => (
                            <a
                              key={a.id}
                              href={`/uploads/support/${a.filePath}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={`/uploads/support/${a.filePath}`}
                                alt={a.fileName}
                                className="support-widget__image"
                              />
                            </a>
                          ))
                        : m.body}
                    </div>
                  ))}
                </div>

                <div className="support-widget__input-row">
                  <button
                    type="button"
                    className="support-widget__attach"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach screenshot"
                    aria-label="Attach screenshot"
                  >
                    📎
                  </button>

                  <textarea
                    className="support-widget__textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Reply to support…"
                    disabled={loading}
                  />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFileSelect}
                />

                {error && <p className="support-widget__error">{error}</p>}

                <button
                  className="support-widget__send"
                  onClick={sendMessage}
                  disabled={loading || !message.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send
                    </>
                  )}
                </button>
              </>
            ) : view === "list" ? (
              <>
                <p className="support-widget__placeholder">
                  Your conversations
                </p>

                <div className="support-widget__ticketlist">
                  {tickets.length === 0 ? (
                    <p className="support-widget__sub">No conversations yet.</p>
                  ) : (
                    tickets.map((t) => (
                      <button
                        key={t.id}
                        className="support-widget__ticket"
                        onClick={() => loadTicket(t.id)}
                      >
                        <div className="support-widget__ticketTop">
                          <span className="support-widget__ticketCat">
                            {t.category}
                          </span>
                          <span className="support-widget__ticketStatus">
                            {t.status}
                          </span>
                        </div>

                        {t.lastMessage?.body ? (
                          <div className="support-widget__ticketPreview">
                            {t.lastMessage.body}
                          </div>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>

                {error && <p className="support-widget__error">{error}</p>}
              </>
            ) : !category ? (
              <>
                <p className="support-widget__placeholder">
                  👋 Hi! What do you need help with?
                </p>

                <button
                  className="support-widget__mychats"
                  onClick={() => setView("list")}
                >
                  My conversations
                </button>

                <div className="support-widget__categories">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      className="support-widget__category"
                      onClick={() => {
                        setCategory(c.key);
                        setError(null);
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {error && <p className="support-widget__error">{error}</p>}
              </>
            ) : (
              <>
                <p className="support-widget__placeholder">
                  Start a new conversation
                </p>

                <textarea
                  className="support-widget__textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue…"
                  disabled={loading}
                />

                {error && <p className="support-widget__error">{error}</p>}

                <button
                  className="support-widget__send"
                  onClick={sendMessage}
                  disabled={loading || !message.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
