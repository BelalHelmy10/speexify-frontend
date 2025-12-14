// web/src/pages/Calendar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Premium Calendar Experience with Modern Aesthetics & Smooth Interactions
// Left: Enhanced mini calendar with stats
// Right: Polished React Big Calendar with gradient events
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import api from "@/lib/api";
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
} from "date-fns";

import { useRouter, usePathname } from "next/navigation";
import { getDictionary, t } from "@/app/i18n";

// date-fns localizer for RBC
const locales = {};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales,
});

// Map backend sessions → RBC events
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
    };
  });

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
  // month (include leading/trailing days that show in the grid)
  return {
    start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
  };
}

// Countdown hook with injectable labels
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

function SessionRow({
  s,
  timezone,
  onCancel,
  onRescheduleClick,
  isUpcoming = true,
  isTeacher = false,
  isAdmin = false,
  dict,
  prefix = "",
}) {
  const countdown = useCountdown(s.startAt, s.endAt, {
    startsIn: t(dict, "countdown_starts_in"),
    live: t(dict, "countdown_live"),
    ended: t(dict, "countdown_ended"),
  });

  const joinable = canJoin(s.startAt, s.endAt);

  const isGroup = String(s.type || "").toUpperCase() === "GROUP";
  const cap = typeof s.capacity === "number" ? s.capacity : null;
  const count =
    typeof s.participantCount === "number" ? s.participantCount : null;

  const canReschedule = isTeacher || isAdmin;

  const cancelLabel =
    isGroup && !isTeacher && !isAdmin
      ? t(dict, "session_leave") || "Leave session"
      : t(dict, "session_cancel") || "Cancel";

  const cancelTitle =
    isGroup && !isTeacher && !isAdmin
      ? t(dict, "session_leave_title") || "Leave this group session"
      : t(dict, "session_cancel_title") || "Cancel session";

  const seatsLabel =
    isGroup && (count !== null || cap !== null)
      ? `${count ?? 0}${cap ? ` / ${cap}` : ""}`
      : "";

  const startText = s.startAt?.toLocaleString
    ? s.startAt.toLocaleString()
    : new Date(s.startAt).toLocaleString();

  return (
    <div className="session-item">
      <div className="session-item__indicator"></div>
      <div className="session-item__content">
        <div className="session-item__main">
          <div className="session-item__title">
            {s.title || t(dict, "session_default_title")}
          </div>

          <div className="session-item__meta">
            <span className="session-item__time">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {startText}
            </span>

            {isGroup && (
              <span className="badge badge--info">
                {t(dict, "session_group") || "Group"}
              </span>
            )}

            {isGroup && seatsLabel && (
              <span className="badge badge--neutral">
                {t(dict, "session_seats") || "Seats"}: {seatsLabel}
              </span>
            )}

            {s.status && (
              <span className={`badge badge--${s.status}`}>{s.status}</span>
            )}
          </div>
        </div>

        <div className="session-item__actions">
          {isUpcoming ? (
            <>
              <a
                href={`${prefix}/classroom/${s.id}`}
                className={`btn ${
                  joinable ? "btn--primary btn--glow" : "btn--ghost"
                }`}
                title={
                  joinable
                    ? t(dict, "countdown_live")
                    : t(dict, "countdown_starts_in")
                }
              >
                {joinable ? t(dict, "countdown_live") : countdown}
              </a>

              {canReschedule && (
                <button
                  className="btn btn--ghost"
                  onClick={() => onRescheduleClick(s)}
                >
                  {t(dict, "session_reschedule") || "Reschedule"}
                </button>
              )}

              <button
                className="btn btn--ghost btn--danger"
                onClick={() => onCancel(s)}
                title={cancelTitle}
              >
                {cancelLabel}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// time window in which user can "join"
const canJoin = (startAt, endAt, windowMins = 15) => {
  const now = new Date();
  const start = new Date(startAt);
  const end = endAt
    ? new Date(endAt)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const early = new Date(start.getTime() - windowMins * 60 * 1000);
  return now >= early && now <= end;
};

export default function CalendarPage() {
  const { user, checking } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const dict = useMemo(() => getDictionary(locale, "calendar"), [locale]);

  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("week");
  const calRef = useRef(null);

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

  // Premium event styling with gradients and shadows
  const eventPropGetter = useCallback((event) => {
    const isCanceled = event.status === "canceled";
    const style = {
      background: isCanceled
        ? "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)"
        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      border: "none",
      color: "#fff",
      borderRadius: "12px",
      padding: "6px 12px",
      opacity: isCanceled ? 0.85 : 1,
      textDecoration: isCanceled ? "line-through" : "none",
      boxShadow: isCanceled
        ? "0 4px 12px rgba(255, 107, 107, 0.3)"
        : "0 4px 12px rgba(102, 126, 234, 0.4)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      fontWeight: "600",
      fontSize: "13px",
      letterSpacing: "0.3px",
    };
    return { style, className: isCanceled ? "ev--canceled" : "ev--scheduled" };
  }, []);

  // Custom event component with elegant icon (uses translated default title)
  // Custom event component with group + seats
  const EventComp = ({ event }) => {
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
  };

  const components = useMemo(() => ({ event: EventComp }), [dict]);

  // Click → go to session detail page
  const onSelectEvent = useCallback(
    (event) => {
      if (!event?.id) return;
      router.push(`${prefix}/dashboard/sessions/${event.id}`);
    },
    [router, prefix]
  );

  // Mini calendar → jump date
  const onMiniChange = (date) => {
    setSelectedDate(date);
    setCurrentDate(date);
  };

  // Stats calculation
  const scheduledCount = events.filter((e) => e.status === "scheduled").length;
  const canceledCount = events.filter((e) => e.status === "canceled").length;
  const currentMonthYear = format(currentDate, "MMMM yyyy");

  if (checking)
    return (
      <div className="calendar-premium-container">{t(dict, "loading")}</div>
    );
  if (!user)
    return (
      <div className="calendar-premium-container">{t(dict, "not_auth")}</div>
    );

  return (
    <div className="calendar-premium-container">
      {/* Animated gradient background */}
      <div className="calendar-bg-gradient"></div>

      {/* Header Section */}
      <div className="calendar-header">
        <div className="calendar-header-content">
          <h1 className="calendar-title">
            <span className="calendar-icon">📅</span>
            {t(dict, "title")}
          </h1>
          <p className="calendar-subtitle">{t(dict, "subtitle")}</p>
        </div>
      </div>

      {events.length === 0 && (
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
              </div>

              {/* Stats Card */}
              <div className="mini-stats-card">
                <div className="stat-item">
                  <div className="stat-value">{scheduledCount}</div>
                  <div className="stat-label">{t(dict, "stats_upcoming")}</div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <div className="stat-value">{canceledCount}</div>
                  <div className="stat-label">{t(dict, "stats_canceled")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Main Calendar */}
          <div className="calendar-two-pane__right">
            <BigCalendar
              ref={calRef}
              localizer={localizer}
              date={currentDate}
              view={view}
              onView={(v) => setView(v)}
              onNavigate={(d) => setCurrentDate(d)}
              onRangeChange={handleRangeChange}
              onSelectEvent={onSelectEvent}
              events={events}
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
                weekdayFormat: (date, culture, lzr) => lzr.format(date, "EEEE"),
                dayHeaderFormat: (date, culture, lzr) =>
                  lzr.format(date, "EEEE, MMMM d"),
              }}
              style={{ height: 800 }}
              toolbar
            />
          </div>
        </div>
      </div>
    </div>
  );
}
