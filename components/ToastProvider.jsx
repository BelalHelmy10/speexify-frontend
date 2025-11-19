"use client";

import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null); // <- for confirm()

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, options = {}) => {
      const id = ++idCounter;
      const { type = "info", duration = 4000 } = options;

      setToasts((prev) => [...prev, { id, type, message }]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  // Promise-based confirm modal
  const confirmModal = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const handleConfirm = (result) => {
    if (!confirmState) return;
    confirmState.resolve(result);
    setConfirmState(null);
  };

  // Build a toast API object
  const toast = {
    success: (msg, opts) => showToast(msg, { ...opts, type: "success" }),
    error: (msg, opts) => showToast(msg, { ...opts, type: "error" }),
    info: (msg, opts) => showToast(msg, { ...opts, type: "info" }),
  };

  const value = {
    // Backwards-compatible helpers
    show: showToast,
    ...toast,

    // For patterns like `const { toast } = useToast()`
    toast,

    // Confirm modal API
    confirmModal,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          zIndex: 9999,
          bottom: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              minWidth: 220,
              maxWidth: 320,
              padding: "10px 14px",
              borderRadius: 999,
              fontSize: 14,
              color: t.type === "error" ? "#991b1b" : "#022c22",
              background:
                t.type === "error"
                  ? "#fee2e2"
                  : t.type === "success"
                  ? "#dcfce7"
                  : "#e0f2fe",
              boxShadow: "0 10px 25px rgba(15,23,42,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                color: "inherit",
              }}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: "white",
              padding: "16px 20px",
              borderRadius: 12,
              maxWidth: 360,
              width: "90%",
              boxShadow: "0 18px 45px rgba(15,23,42,0.4)",
            }}
          >
            <p style={{ marginBottom: 16 }}>{confirmState.message}</p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <button
                onClick={() => handleConfirm(false)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid #cbd5f5",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ToastProvider>");
  }
  return { confirmModal: ctx.confirmModal };
}
