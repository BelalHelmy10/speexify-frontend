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
import { formatNumber } from "@/utils/locale";
import { useClassroomText } from "./classroomText";

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
  locale = "en",
}) {
  const ct = useClassroomText();
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
        aria-label={ct("cr_lobby_badge_aria", { n: formatNumber(count, locale) })}
      >
        <span className="cr-lobby-badge__pulse" />
        <Bell size={18} />
        <span className="cr-lobby-badge__count">{formatNumber(count, locale)}</span>
        <span className="cr-lobby-badge__label">
          {count === 1 ? ct("cr_lobby_one_waiting") : ct("cr_lobby_many_waiting")}
        </span>
      </button>
    );
  }

  if (!isOpen) return null;

  return (
    <div ref={panelRef} className="cr-lobby-panel" role="dialog" aria-label={ct("cr_lobby_aria")}>
      {/* Header */}
      <header className="cr-lobby-panel__header">
        <div className="cr-lobby-panel__header-left">
          <Users size={18} />
          <h3 className="cr-lobby-panel__title">
            {ct("cr_lobby_title")}
            {count > 0 && (
              <span className="cr-lobby-panel__count">{formatNumber(count, locale)}</span>
            )}
          </h3>
        </div>
        <button
          type="button"
          className="cr-lobby-panel__close"
          onClick={onClose || onToggle}
          aria-label={ct("cr_lobby_close")}
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
            <p>{ct("cr_lobby_empty")}</p>
            <span>{ct("cr_lobby_empty_hint")}</span>
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
                  {isAdmittingAll ? ct("cr_lobby_admitting") : ct("cr_lobby_admit_all", { n: formatNumber(count, locale) })}
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
                        <strong>{learner.name || ct("cr_learner")}</strong>
                        {learner.email && <span>{learner.email}</span>}
                      </div>
                    </div>

                    <div className="cr-lobby-panel__actions">
                      <button
                        type="button"
                        className="cr-lobby-panel__btn cr-lobby-panel__btn--admit"
                        onClick={() => handleAdmit(learner.id)}
                        disabled={isAdmitting || isDenying}
                        aria-label={ct("cr_lobby_admit_name", { name: learner.name || ct("cr_learner") })}
                      >
                        <UserCheck size={15} />
                        {isAdmitting ? "…" : ct("cr_lobby_admit")}
                      </button>
                      <button
                        type="button"
                        className="cr-lobby-panel__btn cr-lobby-panel__btn--deny"
                        onClick={() => handleDeny(learner.id)}
                        disabled={isAdmitting || isDenying}
                        aria-label={ct("cr_lobby_deny_name", { name: learner.name || ct("cr_learner") })}
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
