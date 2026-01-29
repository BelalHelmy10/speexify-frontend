// web/src/pages/Calendar.jsx (or app/calendar/page.js)
// ─────────────────────────────────────────────────────────────────────────────
// Premium Calendar Experience with Modern Aesthetics & Smooth Interactions
// ✨ ENHANCED: Added Availability Layer for setting available time slots
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import api, { clearCsrfToken } from "@/lib/api";
import MiniCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import useAuth from "@/hooks/useAuth";

import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import {
  parse,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  getDay,
  format,
  addDays,
} from "date-fns";

import { useRouter, usePathname } from "next/navigation";
import { getDictionary, t } from "@/app/i18n";
import { useToast } from "@/components/ToastProvider";

// date-fns localizer for RBC
const locales = {};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// Map backend sessions → RBC events
const toRbcEvents = (arr = []) =>
  arr.map((s) => {
    const type = String(s.type || "").toUpperCase();
    const isGroup = type === "GROUP";
    const cap = typeof s.capacity === "number" ? s.capacity : null;
    const count =
      typeof s.participantCount === "number" ? s.participantCount : null;

    return {
      id: String(s.id),
      title: s.title || "",
      start: new Date(s.startAt),
      end: s.endAt ? new Date(s.endAt) : new Date(s.startAt),
      status: s.status,
      meetingUrl: s.meetingUrl || "",
      joinUrl: s.joinUrl || "",
      type,
      isGroup,
      capacity: cap,
      participantCount: count,
      seatsLabel:
        isGroup && (count !== null || cap !== null)
          ? `${count ?? 0}${cap ? `/${cap}` : ""}`
          : "",
      _raw: s,
      isAvailability: false,
    };
  });

// Convert availability slots to background events for the calendar
const toAvailabilityEvents = (slots = [], weekStart) => {
  const events = [];

  slots.forEach((slot) => {
    if (slot.status !== "active") return;

    if (slot.isRecurring && slot.dayOfWeek !== null) {
      const targetDay = slot.dayOfWeek;
      const mondayDayOfWeek = 1;
      let daysToAdd = targetDay - mondayDayOfWeek;
      if (daysToAdd < 0) daysToAdd += 7;

      const eventDate = addDays(weekStart, daysToAdd);
      const [startHour, startMin] = slot.startTime.split(":").map(Number);
      const [endHour, endMin] = slot.endTime.split(":").map(Number);

      const start = new Date(eventDate);
      start.setHours(startHour, startMin, 0, 0);

      const end = new Date(eventDate);
      end.setHours(endHour, endMin, 0, 0);

      events.push({
        id: `avail-${slot.id}`,
        slotId: slot.id,
        title: slot.note || "",
        start,
        end,
        isAvailability: true,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        _raw: slot,
      });
    } else if (!slot.isRecurring && slot.specificDate) {
      const eventDate = new Date(slot.specificDate);
      const [startHour, startMin] = slot.startTime.split(":").map(Number);
      const [endHour, endMin] = slot.endTime.split(":").map(Number);

      const start = new Date(eventDate);
      start.setHours(startHour, startMin, 0, 0);

      const end = new Date(eventDate);
      end.setHours(endHour, endMin, 0, 0);

      events.push({
        id: `avail-specific-${slot.id}`,
        slotId: slot.id,
        title: slot.note || "",
        start,
        end,
        isAvailability: true,
        isSpecificDate: true,
        _raw: slot,
      });
    }
  });

  return events;
};

// Compute visible range for a given date + view
function getVisibleRange(date, view) {
  if (view === "week") {
    return {
      start: startOfWeek(date, { weekStartsOn: 1 }),
      end: endOfWeek(date, { weekStartsOn: 1 }),
    };
  }
  if (view === "day") {
    return { start: startOfDay(date), end: endOfDay(date) };
  }
  return {
    start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
  };
}

// Countdown hook
const useCountdown = (startAt, endAt, labels = {}) => {
  const startsIn = labels.startsIn || "Starts in";
  const live = labels.live || "Live";
  const ended = labels.ended || "Ended";

  const [now, setNow] = useState(Date.now());
  const timer = useRef(null);

  useEffect(() => {
    timer.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer.current);
  }, []);

  if (!startAt) return "";

  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : start + 60 * 60 * 1000;

  if (now < start) {
    let remaining = Math.max(0, Math.floor((start - now) / 1000));
    const days = Math.floor(remaining / 86400);
    remaining %= 86400;
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
    parts.push(`${String(secs).padStart(2, "0")}s`);

    return `${startsIn} ${parts.join(" ")}`;
  }

  if (now >= start && now <= end) return live;
  return ended;
};

// Time window in which user can "join"
const canJoin = (startAt, endAt, windowMins = 15) => {
  const now = new Date();
  const start = new Date(startAt);
  const end = endAt
    ? new Date(endAt)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const early = new Date(start.getTime() - windowMins * 60 * 1000);
  return now >= early && now <= end;
};

/* ═══════════════════════════════════════════════════════════════════════════
   IMPERSONATION BANNER COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
function ImpersonationBanner({ user, onStop }) {
  return (
    <div className="impersonation-banner">
      <div className="impersonation-banner__info">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
          <path d="M12 14l-3-3m3 3l3-3" />
        </svg>
        <div>
          <strong>👁️ Viewing as: {user?.name || user?.email}</strong>
          <span>Role: {user?.role} • You are impersonating this user</span>
        </div>
      </div>
      <div className="impersonation-banner__actions">
        <Link href="/dashboard" className="impersonation-banner__link">
          📊 View Dashboard
        </Link>
        <button onClick={onStop} className="impersonation-banner__stop">
          ✕ Stop Impersonating
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AVAILABILITY MODE TOGGLE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
function AvailabilityModeToggle({
  mode,
  onModeChange,
  availabilityCount,
  dict,
}) {
  return (
    <div className="availability-mode-toggle">
      <button
        onClick={() => onModeChange("sessions")}
        className={`availability-mode-toggle__btn ${mode === "sessions" ? "availability-mode-toggle__btn--active" : ""
          }`}
      >
        📅 {t(dict, "mode_sessions")}
      </button>

      <button
        onClick={() => onModeChange("availability")}
        className={`availability-mode-toggle__btn availability-mode-toggle__btn--availability ${mode === "availability"
            ? "availability-mode-toggle__btn--active-green"
            : ""
          }`}
      >
        🕐 {t(dict, "mode_availability")}
        {availabilityCount > 0 && (
          <span
            className={`availability-mode-toggle__count ${mode === "availability"
                ? "availability-mode-toggle__count--active"
                : ""
              }`}
          >
            {availabilityCount}
          </span>
        )}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AVAILABILITY INSTRUCTIONS PANEL
   ═══════════════════════════════════════════════════════════════════════════ */
function AvailabilityInstructions({ dict, locale, onClose }) {
  return (
    <div className="availability-instructions">
      <div className="availability-instructions__icon">💡</div>
      <div className="availability-instructions__content">
        <h4 className="availability-instructions__title">
          {t(dict, "instructions_title")}
        </h4>
        <ul className="availability-instructions__list">
          <li>{t(dict, "instructions_drag")}</li>
          <li>{t(dict, "instructions_click")}</li>
          <li>{t(dict, "instructions_green")}</li>
        </ul>
      </div>
      <button onClick={onClose} className="availability-instructions__close">
        ✕
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AVAILABILITY SLOT QUICK ACTIONS
   ═══════════════════════════════════════════════════════════════════════════ */
function AvailabilityQuickActions({
  onClearDay,
  onClearAll,
  selectedDay,
  totalSlots,
  saving,
  dict,
  locale,
}) {
  const isRTL = locale === "ar";
  const dayNames = isRTL
    ? ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    : [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

  return (
    <div className="availability-quick-actions">
      {selectedDay !== null && (
        <button
          onClick={() => onClearDay(selectedDay)}
          disabled={saving}
          className="availability-quick-actions__btn availability-quick-actions__btn--clear-day"
        >
          🗑️{" "}
          {isRTL
            ? `مسح ${dayNames[selectedDay]}`
            : `Clear ${dayNames[selectedDay]}`}
        </button>
      )}

      {totalSlots > 0 && (
        <button
          onClick={onClearAll}
          disabled={saving}
          className="availability-quick-actions__btn availability-quick-actions__btn--clear-all"
        >
          🗑️ {t(dict, "clear_all")}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AVAILABILITY STATS CARD
   ═══════════════════════════════════════════════════════════════════════════ */
function AvailabilityStatsCard({ slotCount, totalHours, dict, locale }) {
  return (
    <div className="mini-stats-card mini-stats-card--availability">
      <div className="stat-item">
        <div className="stat-value stat-value--green">{slotCount}</div>
        <div className="stat-label stat-label--green">{t(dict, "slots")}</div>
      </div>
      <div className="stat-divider stat-divider--green"></div>
      <div className="stat-item">
        <div className="stat-value stat-value--green">{totalHours}h</div>
        <div className="stat-label stat-label--green">{t(dict, "weekly")}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SAVING OVERLAY
   ═══════════════════════════════════════════════════════════════════════════ */
function SavingOverlay({ dict }) {
  return (
    <div className="availability-saving-overlay">
      <div className="availability-saving-overlay__spinner"></div>
      <span>{t(dict, "saving")}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN CALENDAR PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CalendarPage() {
  const { user, checking } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = useMemo(() => getDictionary(locale, "calendar"), [locale]);

  // Impersonation detection
  const isImpersonating = !!user?._impersonating;

  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("week");
  const calRef = useRef(null);

  // Availability state
  const [calendarMode, setCalendarMode] = useState("sessions");
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [availabilityEvents, setAvailabilityEvents] = useState([]);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(null);

  // Stop impersonation handler
  const handleStopImpersonate = async () => {
    try {
      await api.post("/admin/impersonate/stop");
      clearCsrfToken();
      toast.success("Stopped viewing as user");
      router.push("/admin");
      setTimeout(() => window.location.reload(), 100);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to stop impersonation");
    }
  };

  // Fetch availability
  const fetchAvailability = useCallback(async () => {
    try {
      const { data } = await api.get("/availability");
      setAvailabilitySlots(data || []);
    } catch (e) {
      console.error("Failed to load availability:", e);
    }
  }, []);

  useEffect(() => {
    if (!checking && user) {
      fetchAvailability();
    }
  }, [checking, user, fetchAvailability]);

  // Convert availability slots to calendar events
  useEffect(() => {
    if (availabilitySlots.length > 0) {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const availEvents = toAvailabilityEvents(availabilitySlots, weekStart);
      setAvailabilityEvents(availEvents);
    } else {
      setAvailabilityEvents([]);
    }
  }, [availabilitySlots, currentDate, view]);

  // Add availability slot
  const addAvailabilitySlot = async (dayOfWeek, startTime, endTime) => {
    try {
      setSavingAvailability(true);
      await api.post("/availability", {
        dayOfWeek,
        startTime,
        endTime,
        isRecurring: true,
      });
      toast.success(t(dict, "success_add"));
      await fetchAvailability();
    } catch (e) {
      const errorMsg = e?.response?.data?.error || t(dict, "error_add");
      toast.error(errorMsg);
    } finally {
      setSavingAvailability(false);
    }
  };

  // Delete availability slot
  const deleteAvailabilitySlot = async (slotId) => {
    try {
      setSavingAvailability(true);
      await api.delete(`/availability/${slotId}`);
      toast.success(t(dict, "success_remove"));
      await fetchAvailability();
    } catch (e) {
      toast.error(e?.response?.data?.error || t(dict, "error_remove"));
    } finally {
      setSavingAvailability(false);
    }
  };

  // Clear day availability
  const clearDayAvailability = async (dayOfWeek) => {
    if (!confirm(t(dict, "confirm_clear_day"))) return;

    try {
      setSavingAvailability(true);
      await api.delete("/availability", {
        params: { dayOfWeek, isRecurring: true },
      });
      toast.success(t(dict, "success_clear"));
      await fetchAvailability();
    } catch (e) {
      toast.error(e?.response?.data?.error || t(dict, "error_clear"));
    } finally {
      setSavingAvailability(false);
    }
  };

  // Clear all availability
  const clearAllAvailability = async () => {
    if (!confirm(t(dict, "confirm_clear_all"))) return;

    try {
      setSavingAvailability(true);
      await api.delete("/availability");
      toast.success(t(dict, "success_clear_all"));
      await fetchAvailability();
    } catch (e) {
      toast.error(e?.response?.data?.error || t(dict, "error_clear"));
    } finally {
      setSavingAvailability(false);
    }
  };

  // Fetch sessions for a range
  const fetchEvents = useCallback(async (startISO, endISO) => {
    setError("");
    const { data } = await api.get("/me/sessions-between", {
      params: { start: startISO, end: endISO, includeCanceled: true },
    });
    return Array.isArray(data) ? data : data?.sessions || [];
  }, []);

  // Load events whenever date or view changes
  useEffect(() => {
    if (checking || !user) return;
    const { start, end } = getVisibleRange(currentDate, view);
    (async () => {
      try {
        const sessions = await fetchEvents(
          start.toISOString(),
          end.toISOString()
        );
        setEvents(toRbcEvents(sessions));
      } catch (e) {
        setError(e?.response?.data?.error || t(dict, "error_failed"));
      }
    })();
  }, [currentDate, view, fetchEvents, checking, user, dict]);

  // Handle RBC's range notifications
  const handleRangeChange = useCallback(
    async (range) => {
      if (checking || !user) return;
      try {
        let start, end;
        if (Array.isArray(range)) {
          start = range[0];
          end = range[range.length - 1];
        } else if (range?.start && range?.end) {
          start = range.start;
          end = range.end;
        } else {
          const r = getVisibleRange(currentDate, view);
          start = r.start;
          end = r.end;
        }
        const sessions = await fetchEvents(
          start.toISOString(),
          end.toISOString()
        );
        setEvents(toRbcEvents(sessions));
      } catch (e) {
        setError(e?.response?.data?.error || t(dict, "error_failed"));
      }
    },
    [currentDate, view, fetchEvents, checking, user, dict]
  );

  // Handle slot selection (for adding availability)
  const handleSelectSlot = useCallback(
    ({ start, end }) => {
      if (calendarMode !== "availability") return;
      if (savingAvailability) return;

      const dayOfWeek = start.getDay();
      const startTime = format(start, "HH:mm");
      const endTime = format(end, "HH:mm");

      setSelectedDayOfWeek(dayOfWeek);
      addAvailabilitySlot(dayOfWeek, startTime, endTime);
    },
    [calendarMode, savingAvailability]
  );

  // Event styling
  const eventPropGetter = useCallback(
    (event) => {
      if (event.isAvailability) {
        return {
          className: `ev--availability ${calendarMode === "availability"
              ? "ev--availability-active"
              : "ev--availability-faded"
            }`,
        };
      }

      const isCanceled = event.status === "canceled";
      return {
        className: `${isCanceled ? "ev--canceled" : "ev--scheduled"} ${calendarMode === "availability" ? "ev--dimmed" : ""
          }`,
      };
    },
    [calendarMode]
  );

  // Custom event component
  const EventComp = useCallback(
    ({ event }) => {
      if (event.isAvailability) {
        return (
          <div className="ev-pill ev-pill--availability">
            <span className="ev-pill__check">✓</span>
            <span className="ev-pill__text">{t(dict, "available")}</span>
          </div>
        );
      }

      const isGroup = !!event?.isGroup;
      const seats = event?.seatsLabel ? ` · ${event.seatsLabel}` : "";

      return (
        <div className="ev-pill">
          <span className="ev-icon">●</span>
          <span className="ev-title">
            {event.title || t(dict, "session_default_title")}
            {isGroup ? ` · ${t(dict, "session_group") || "Group"}` : ""}
            {isGroup ? seats : ""}
          </span>
        </div>
      );
    },
    [dict]
  );

  const components = useMemo(() => ({ event: EventComp }), [EventComp]);

  // Click handler for events
  const onSelectEvent = useCallback(
    (event) => {
      if (event.isAvailability) {
        if (calendarMode === "availability" && event.slotId) {
          if (confirm(t(dict, "confirm_delete_slot"))) {
            deleteAvailabilitySlot(event.slotId);
          }
        }
        return;
      }

      if (!event?.id) return;
      router.push(`${prefix}/dashboard/sessions/${event.id}`);
    },
    [router, prefix, calendarMode, dict]
  );

  // Mini calendar change
  const onMiniChange = (date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setSelectedDayOfWeek(date.getDay());
  };

  // Combine events
  const combinedEvents = useMemo(() => {
    if (calendarMode === "sessions") {
      return [...events, ...availabilityEvents];
    } else {
      return [...availabilityEvents, ...events];
    }
  }, [events, availabilityEvents, calendarMode]);

  // Stats
  const scheduledCount = events.filter((e) => e.status === "scheduled").length;
  const canceledCount = events.filter((e) => e.status === "canceled").length;
  const currentMonthYear = format(currentDate, "MMMM yyyy");
  const activeSlotCount = availabilitySlots.filter(
    (s) => s.status === "active"
  ).length;

  // Total availability hours
  const totalAvailabilityHours = useMemo(() => {
    let minutes = 0;
    availabilitySlots.forEach((slot) => {
      if (slot.status === "active") {
        const [startH, startM] = slot.startTime.split(":").map(Number);
        const [endH, endM] = slot.endTime.split(":").map(Number);
        minutes += endH * 60 + endM - (startH * 60 + startM);
      }
    });
    return (minutes / 60).toFixed(1);
  }, [availabilitySlots]);

  if (checking)
    return (
      <div className="calendar-premium-container">{t(dict, "loading")}</div>
    );
  if (!user)
    return (
      <div className="calendar-premium-container">{t(dict, "not_auth")}</div>
    );

  return (
    <>
      {isImpersonating && (
        <ImpersonationBanner user={user} onStop={handleStopImpersonate} />
      )}

      <div className="calendar-premium-container">
        <div className="calendar-bg-gradient"></div>

        {/* Header Section */}
        <div className="calendar-header">
          <div className="calendar-header-content calendar-header-content--with-toggle">
            <div className="calendar-header__left">
              <h1 className="calendar-title">
                <span className="calendar-icon">📅</span>
                {t(dict, "title")}
              </h1>
              <p className="calendar-subtitle">
                {calendarMode === "availability"
                  ? t(dict, "availability_subtitle")
                  : t(dict, "subtitle")}
                {isImpersonating && (
                  <span className="calendar-subtitle__impersonating">
                    • Viewing {user?.name || user?.email}'s calendar
                  </span>
                )}
              </p>
              <div className="calendar-timezone-badge">
                <span className="calendar-timezone-badge__icon">🌍</span>
                <span className="calendar-timezone-badge__text">
                  Times shown in your local time ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                </span>
              </div>
            </div>

            <AvailabilityModeToggle
              mode={calendarMode}
              onModeChange={setCalendarMode}
              availabilityCount={activeSlotCount}
              dict={dict}
            />
          </div>
        </div>

        {/* Availability Instructions */}
        {calendarMode === "availability" && showInstructions && (
          <div className="calendar-instructions-wrapper">
            <AvailabilityInstructions
              dict={dict}
              locale={locale}
              onClose={() => setShowInstructions(false)}
            />
          </div>
        )}

        {events.length === 0 && calendarMode === "sessions" && (
          <p className="calendar-empty">{t(dict, "empty")}</p>
        )}
        {error && (
          <div className="calendar-error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="calendar-two-pane">
          <div className="calendar-two-pane__wrap">
            {/* Left: Mini Calendar Sidebar */}
            <div className="calendar-two-pane__left">
              <div className="mini-cal-wrapper">
                <div className="mini-cal-header">
                  <h3 className="mini-cal-title">{t(dict, "quick_nav")}</h3>
                  <div className="mini-cal-month">{currentMonthYear}</div>
                </div>

                <MiniCalendar
                  value={selectedDate}
                  onChange={onMiniChange}
                  showNeighboringMonth={false}
                  next2Label={null}
                  prev2Label={null}
                  className="mini-cal"
                />

                <div className="mini-legend">
                  <div className="legend-item">
                    <span className="legend-dot legend-dot--scheduled"></span>
                    <span className="legend-text">
                      {t(dict, "legend_scheduled")}
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot legend-dot--canceled"></span>
                    <span className="legend-text">
                      {t(dict, "legend_canceled")}
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot legend-dot--available"></span>
                    <span className="legend-text">
                      {t(dict, "legend_available")}
                    </span>
                  </div>
                </div>

                {/* Stats Card */}
                <div className="mini-stats-card">
                  <div className="stat-item">
                    <div className="stat-value">{scheduledCount}</div>
                    <div className="stat-label">
                      {t(dict, "stats_upcoming")}
                    </div>
                  </div>
                  <div className="stat-divider"></div>
                  <div className="stat-item">
                    <div className="stat-value">{canceledCount}</div>
                    <div className="stat-label">
                      {t(dict, "stats_canceled")}
                    </div>
                  </div>
                </div>

                {/* Availability Stats */}
                {calendarMode === "availability" && (
                  <AvailabilityStatsCard
                    slotCount={activeSlotCount}
                    totalHours={totalAvailabilityHours}
                    dict={dict}
                    locale={locale}
                  />
                )}

                {/* Quick Actions for Availability Mode */}
                {calendarMode === "availability" && (
                  <AvailabilityQuickActions
                    onClearDay={clearDayAvailability}
                    onClearAll={clearAllAvailability}
                    selectedDay={selectedDayOfWeek}
                    totalSlots={activeSlotCount}
                    saving={savingAvailability}
                    dict={dict}
                    locale={locale}
                  />
                )}

                {/* Impersonation info card */}
                {isImpersonating && (
                  <div className="impersonation-info-card">
                    <div className="impersonation-info-card__title">
                      👁️ Admin Preview
                    </div>
                    <div className="impersonation-info-card__text">
                      Viewing {user?.role}'s calendar as admin
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Main Calendar */}
            <div
              className={`calendar-two-pane__right ${calendarMode === "availability"
                  ? "calendar-two-pane__right--availability-mode"
                  : ""
                }`}
            >
              <BigCalendar
                ref={calRef}
                localizer={localizer}
                date={currentDate}
                view={view}
                onView={(v) => setView(v)}
                onNavigate={(d) => {
                  setCurrentDate(d);
                  setSelectedDayOfWeek(d.getDay());
                }}
                onRangeChange={handleRangeChange}
                onSelectEvent={onSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable={calendarMode === "availability"}
                events={combinedEvents}
                startAccessor="start"
                endAccessor="end"
                components={components}
                eventPropGetter={eventPropGetter}
                views={["month", "week", "day", "agenda"]}
                defaultView="week"
                drilldownView="day"
                popup
                step={30}
                timeslots={2}
                min={new Date(1970, 1, 1, 0, 0, 0)}
                max={new Date(1970, 1, 1, 23, 59, 59)}
                scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
                formats={{
                  dayFormat: (date, culture, lzr) => lzr.format(date, "EEE d"),
                  weekdayFormat: (date, culture, lzr) =>
                    lzr.format(date, "EEEE"),
                  dayHeaderFormat: (date, culture, lzr) =>
                    lzr.format(date, "EEEE, MMMM d"),
                }}
                style={{ height: 800 }}
                toolbar
              />

              {savingAvailability && <SavingOverlay dict={dict} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
