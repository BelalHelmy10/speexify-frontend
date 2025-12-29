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

  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Load tickets when widget opens
  useEffect(() => {
    if (!open) return;

    setLoading(true);
    listSupportTickets()
      .then((res) => {
        if (res.tickets?.length) {
          loadTicket(res.tickets[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  async function loadTicket(id) {
    setLoading(true);
    try {
      const res = await getSupportTicket(id);
      setActiveTicket(res.ticket);
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
        await loadTicket(activeTicket.id);
      } else {
        const res = await createSupportTicket({
          category,
          message,
        });
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

      setActiveTicket((prev) => ({
        ...prev,
        messages: [...prev.messages, res.message],
      }));
    } catch (e) {
      setError(e.message);
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
  }

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
            {activeTicket || category ? (
              <button onClick={reset} className="support-widget__back">
                <ArrowLeft size={18} />
              </button>
            ) : null}
            <span>Support</span>
            <button onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </header>

          <div className="support-widget__body">
            {loading ? (
              <p className="support-widget__sub">Loading…</p>
            ) : activeTicket ? (
              <>
                <div className="support-widget__messages">
                  {activeTicket.messages.map((m) => (
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
                            <img
                              key={a.id}
                              src={`/uploads/support/${a.filePath}`}
                              alt={a.fileName}
                              className="support-widget__image"
                            />
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
                  >
                    📎
                  </button>

                  <textarea
                    className="support-widget__textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Reply to support…"
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
            ) : !category ? (
              <>
                <p className="support-widget__placeholder">
                  👋 Hi! What do you need help with?
                </p>

                <div className="support-widget__categories">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      className="support-widget__category"
                      onClick={() => setCategory(c.key)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
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
                />

                <button
                  className="support-widget__send"
                  onClick={sendMessage}
                  disabled={loading || !message.trim()}
                >
                  Send
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
