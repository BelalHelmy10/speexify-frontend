// components/SupportWidget.jsx
"use client";

import { useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { createSupportTicket } from "@/lib/supportApi";
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
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSend() {
    if (!message.trim() || !category || loading) return;

    setLoading(true);
    setError(null);

    try {
      await createSupportTicket({
        category,
        message,
      });

      setSuccess(true);
      setMessage("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function resetAndClose() {
    setOpen(false);
    setCategory(null);
    setMessage("");
    setError(null);
    setSuccess(false);
  }

  return (
    <>
      {/* Floating button */}
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
            <span>Support</span>
            <button onClick={resetAndClose} aria-label="Close support">
              <X size={18} />
            </button>
          </header>

          <div className="support-widget__body">
            {success ? (
              <>
                <p className="support-widget__placeholder">
                  ✅ Your message has been sent
                </p>
                <p className="support-widget__sub">
                  Our support team will reply here as soon as possible.
                </p>
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

                <p className="support-widget__sub">
                  We usually reply within a few hours.
                </p>
              </>
            ) : (
              <>
                <p className="support-widget__placeholder">
                  You’re contacting support about{" "}
                  <strong>
                    {CATEGORIES.find((c) => c.key === category)?.label}
                  </strong>
                </p>

                <textarea
                  className="support-widget__textarea"
                  placeholder="Describe your issue in as much detail as possible…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  disabled={loading}
                />

                {error && <p className="support-widget__error">{error}</p>}

                <button
                  className="support-widget__send"
                  disabled={!message.trim() || loading}
                  onClick={handleSend}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send message
                    </>
                  )}
                </button>

                <p className="support-widget__sub">
                  This will start a support conversation.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
