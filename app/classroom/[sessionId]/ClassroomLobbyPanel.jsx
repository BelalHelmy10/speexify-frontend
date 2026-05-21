// app/classroom/[sessionId]/ClassroomLobbyPanel.jsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  UserCheck,
  UserX,
  Users,
  CheckCheck,
  X,
  Bell,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* -----------------------------------------------------------
   Lobby Panel — Teacher-facing panel to manage learners
   waiting for admission in group sessions.

   Props:
     - waitingLearners: [{ id, name, email, avatarUrl, joinedAt }]
     - onAdmit: (learnerId) => void
     - onDeny: (learnerId) => void
     - onAdmitAll: () => void
     - isOpen: boolean
     - onToggle: () => void
     - onClose: () => void
----------------------------------------------------------- */
export default function ClassroomLobbyPanel({
  waitingLearners = [],
  onAdmit,
  onDeny,
  onAdmitAll,
  isOpen = false,
  onToggle,
  onClose,
}) {
  const [admittingIds, setAdmittingIds] = useState(new Set());
  const [denyingIds, setDenyingIds] = useState(new Set());
  const [isAdmittingAll, setIsAdmittingAll] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        (onClose || onToggle)?.();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, onToggle]);

  const handleAdmit = useCallback(
    async (learnerId) => {
      if (admittingIds.has(learnerId)) return;
      setAdmittingIds((prev) => new Set([...prev, learnerId]));
      try {
        await onAdmit?.(learnerId);
      } finally {
        setAdmittingIds((prev) => {
          const next = new Set(prev);
          next.delete(learnerId);
          return next;
        });
      }
    },
    [onAdmit, admittingIds]
  );

  const handleDeny = useCallback(
    async (learnerId) => {
      if (denyingIds.has(learnerId)) return;
      setDenyingIds((prev) => new Set([...prev, learnerId]));
      try {
        await onDeny?.(learnerId);
      } finally {
        setDenyingIds((prev) => {
          const next = new Set(prev);
          next.delete(learnerId);
          return next;
        });
      }
    },
    [onDeny, denyingIds]
  );

  const handleAdmitAll = useCallback(async () => {
    if (isAdmittingAll) return;
    setIsAdmittingAll(true);
    try {
      await onAdmitAll?.();
    } finally {
      setIsAdmittingAll(false);
    }
  }, [onAdmitAll, isAdmittingAll]);

  const count = waitingLearners.length;

  // Floating badge (always visible when there are waiting learners)
  if (!isOpen && count > 0) {
    return (
      <button
        type="button"
        className="cr-lobby-badge"
        onClick={onToggle}
        aria-label={`${count} learner${count > 1 ? "s" : ""} waiting for admission`}
      >
        <span className="cr-lobby-badge__pulse" />
        <Bell size={18} />
        <span className="cr-lobby-badge__count">{count}</span>
        <span className="cr-lobby-badge__label">
          {count === 1 ? "Learner waiting" : "Learners waiting"}
        </span>
      </button>
    );
  }

  if (!isOpen) return null;

  return (
    <div ref={panelRef} className="cr-lobby-panel" role="dialog" aria-label="Waiting room lobby">
      {/* Header */}
      <header className="cr-lobby-panel__header">
        <div className="cr-lobby-panel__header-left">
          <Users size={18} />
          <h3 className="cr-lobby-panel__title">
            Waiting Room
            {count > 0 && (
              <span className="cr-lobby-panel__count">{count}</span>
            )}
          </h3>
        </div>
        <button
          type="button"
          className="cr-lobby-panel__close"
          onClick={onClose || onToggle}
          aria-label="Close lobby panel"
        >
          <X size={16} />
        </button>
      </header>

      {/* Body */}
      <div className="cr-lobby-panel__body">
        {count === 0 ? (
          <div className="cr-lobby-panel__empty">
            <div className="cr-lobby-panel__empty-icon">
              <UserCheck size={24} />
            </div>
            <p>No one is waiting.</p>
            <span>Learners who join will appear here for your approval.</span>
          </div>
        ) : (
          <>
            {/* Admit all bar */}
            {count > 1 && (
              <div className="cr-lobby-panel__admit-all-bar">
                <button
                  type="button"
                  className="cr-lobby-panel__admit-all"
                  onClick={handleAdmitAll}
                  disabled={isAdmittingAll}
                >
                  <CheckCheck size={16} />
                  {isAdmittingAll ? "Admitting…" : `Admit all (${count})`}
                </button>
              </div>
            )}

            {/* Learner list */}
            <ul className="cr-lobby-panel__list">
              {waitingLearners.map((learner) => {
                const isAdmitting = admittingIds.has(learner.id);
                const isDenying = denyingIds.has(learner.id);

                return (
                  <li key={learner.id} className="cr-lobby-panel__item">
                    <div className="cr-lobby-panel__learner">
                      <div className="cr-lobby-panel__avatar">
                        {(learner.name || learner.email || "L")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="cr-lobby-panel__learner-info">
                        <strong>{learner.name || "Learner"}</strong>
                        {learner.email && <span>{learner.email}</span>}
                      </div>
                    </div>

                    <div className="cr-lobby-panel__actions">
                      <button
                        type="button"
                        className="cr-lobby-panel__btn cr-lobby-panel__btn--admit"
                        onClick={() => handleAdmit(learner.id)}
                        disabled={isAdmitting || isDenying}
                        aria-label={`Admit ${learner.name || "learner"}`}
                      >
                        <UserCheck size={15} />
                        {isAdmitting ? "…" : "Admit"}
                      </button>
                      <button
                        type="button"
                        className="cr-lobby-panel__btn cr-lobby-panel__btn--deny"
                        onClick={() => handleDeny(learner.id)}
                        disabled={isAdmitting || isDenying}
                        aria-label={`Deny ${learner.name || "learner"}`}
                      >
                        <UserX size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
