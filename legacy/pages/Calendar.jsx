// web/src/pages/Calendar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Premium Calendar Experience with Modern Aesthetics & Smooth Interactions
// Left: Enhanced mini calendar with stats
// Right: Polished React Big Calendar with gradient events
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import api from "../lib/api";
import MiniCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

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

import { getSafeExternalUrl } from "../utils/url";

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
const toRbcEvents = (arr = []) =>
  arr.map((s) => ({
    id: String(s.id),
    title: s.title || "Session",
    start: new Date(s.startAt),
    end: s.endAt ? new Date(s.endAt) : new Date(s.startAt),
    status: s.status, // "scheduled" | "canceled"
    meetingUrl: s.meetingUrl || "",
  }));

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

export default function CalendarPage() {
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");
  const calRef = useRef(null);

  // Fetch sessions for a range
  const fetchEvents = useCallback(async (startISO, endISO) => {
    setError("");
    const { data } = await api.get("/api/me/sessions-between", {
      params: { start: startISO, end: endISO, includeCanceled: true },
    });
    return Array.isArray(data) ? data : data?.sessions || [];
  }, []);

  // Load events whenever date or view changes
  useEffect(() => {
    const { start, end } = getVisibleRange(currentDate, view);
    (async () => {
      try {
        const sessions = await fetchEvents(
          start.toISOString(),
          end.toISOString()
        );
        setEvents(toRbcEvents(sessions));
      } catch (e) {
        setError(e?.response?.data?.error || "Failed to load sessions");
      }
    })();
  }, [currentDate, view, fetchEvents]);

  // Handle RBC's range notifications
  const handleRangeChange = useCallback(
    async (range) => {
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
        setError(e?.response?.data?.error || "Failed to load sessions");
      }
    },
    [currentDate, view, fetchEvents]
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

  // Custom event component with elegant icon
  const EventComp = useCallback(({ event }) => {
    return (
      <div className="ev-pill">
        <span className="ev-icon">●</span>
        <span className="ev-title">{event.title}</span>
      </div>
    );
  }, []);

  // Click → join link
  const onSelectEvent = useCallback((event) => {
    const choice = window.prompt(
      `📅 ${
        event.title
      }\n\n✨ Status: ${event.status.toUpperCase()}\n\n💡 Type "join" to open the meeting link`,
      "join"
    );
    if (choice && choice.toLowerCase().startsWith("join")) {
      const url = getSafeExternalUrl(event.meetingUrl);
      if (!url) return alert("⚠️ No valid meeting link available.");
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  // Mini calendar → jump date
  const onMiniChange = (date) => {
    setSelectedDate(date);
    setCurrentDate(date);
  };

  const components = useMemo(() => ({ event: EventComp }), [EventComp]);

  // Stats calculation
  const scheduledCount = events.filter((e) => e.status === "scheduled").length;
  const canceledCount = events.filter((e) => e.status === "canceled").length;
  const currentMonthYear = format(currentDate, "MMMM yyyy");

  return (
    <div className="calendar-premium-container">
      {/* Animated gradient background */}
      <div className="calendar-bg-gradient"></div>

      {/* Header Section */}
      <div className="calendar-header">
        <div className="calendar-header-content">
          <h1 className="calendar-title">
            <span className="calendar-icon">📅</span>
            My Schedule
          </h1>
          <p className="calendar-subtitle">
            Manage your upcoming sessions and meetings
          </p>
        </div>
      </div>

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
                <h3 className="mini-cal-title">Quick Navigation</h3>
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
                  <span className="legend-text">Scheduled</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot legend-dot--canceled"></span>
                  <span className="legend-text">Canceled</span>
                </div>
              </div>

              {/* Stats Card */}
              <div className="mini-stats-card">
                <div className="stat-item">
                  <div className="stat-value">{scheduledCount}</div>
                  <div className="stat-label">Upcoming</div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <div className="stat-value">{canceledCount}</div>
                  <div className="stat-label">Canceled</div>
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
              defaultView="month"
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
