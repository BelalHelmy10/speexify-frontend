// components/admin/AdminAvailabilityView.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import Spinner from "@/components/Spinner";
import useAuth from "@/hooks/useAuth";
import { getDictionary, t } from "@/app/i18n";

// Day names
const DAYS = [
  { key: 0, name: "Sunday", short: "Sun" },
  { key: 1, name: "Monday", short: "Mon" },
  { key: 2, name: "Tuesday", short: "Tue" },
  { key: 3, name: "Wednesday", short: "Wed" },
  { key: 4, name: "Thursday", short: "Thu" },
  { key: 5, name: "Friday", short: "Fri" },
  { key: 6, name: "Saturday", short: "Sat" },
];

// Time slots for the grid
const TIME_SLOTS = [];
for (let hour = 6; hour < 23; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${hour.toString().padStart(2, "0")}:30`);
}
TIME_SLOTS.push("23:00");

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime12h(time24) {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function isSlotInRange(slotTime, startTime, endTime) {
  const slot = timeToMinutes(slotTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return slot >= start && slot < end;
}

export default function AdminAvailabilityView() {
  const toast = useToast();
  const { user } = useAuth();
  const locale = user?.language === "ar" ? "ar" : "en";
  const copy = getDictionary(locale, "admin");
  const localizedDays = useMemo(() => DAYS.map((day) => ({
    ...day,
    name: t(copy, `day${day.name}`),
    short: t(copy, `short${day.name}`),
  })), [copy]);

  const [summary, setSummary] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAvailability, setUserAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);

  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [showOnlyWithAvailability, setShowOnlyWithAvailability] =
    useState(false);

  const [viewMode, setViewMode] = useState("summary"); // summary, calendar, list

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/availability/summary", {
        params: { role: roleFilter || undefined, q: searchQuery || undefined, limit: 50, offset: page * 50 },
      });
      setSummary(data);
    } catch (err) {
      console.error("Failed to load availability summary:", err);
      toast?.error?.(t(copy, "failedAvailability"));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchQuery, page, toast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const fetchUserAvailability = async (userId) => {
    try {
      setUserLoading(true);
      const { data } = await api.get(`/admin/availability/user/${userId}`);
      setUserAvailability(data);
    } catch (err) {
      console.error("Failed to load user availability:", err);
      toast?.error?.(t(copy, "failedUserAvailability"));
    } finally {
      setUserLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    fetchUserAvailability(user.id);
  };

  const filteredUsers = useMemo(() => {
    if (!summary?.users) return [];

    return summary.users.filter((user) => {
      if (showOnlyWithAvailability && !user.hasAvailability) {
        return false;
      }

      // NOTE: role filtering is performed by the API param,
      // but also keep UI grouping working if API returns all.
      if (roleFilter && user.role !== roleFilter) return false;

      return true;
    });
  }, [summary?.users, showOnlyWithAvailability, roleFilter]);

  const usersByRole = useMemo(() => {
    const teachers = filteredUsers.filter((u) => u.role === "teacher");
    const learners = filteredUsers.filter((u) => u.role === "learner");
    return { teachers, learners };
  }, [filteredUsers]);

  const isCellAvailable = useCallback(
    (dayOfWeek, timeSlot) => {
      if (!userAvailability?.byDayOfWeek) return false;
      const daySlots = userAvailability.byDayOfWeek[dayOfWeek] || [];
      return daySlots.some(
        (slot) =>
          slot.status === "active" &&
          isSlotInRange(timeSlot, slot.startTime, slot.endTime)
      );
    },
    [userAvailability]
  );

  if (loading) {
    return (
      <div className="av-loading">
        <Spinner className="av-spinner" />
      </div>
    );
  }

  const totalUsers = summary?.totalUsers || 0;
  const usersWithAvailability = summary?.usersWithAvailability || 0;
  const usersWithoutAvailability = summary?.usersWithoutAvailability || 0;
  const completionRate =
    usersWithAvailability && totalUsers
      ? Math.round((usersWithAvailability / totalUsers) * 100)
      : 0;

  return (
    <div className="av">
      {/* Header / Summary Card */}
      <section className="av-hero">
        <div className="av-hero__head">
          <div className="av-hero__titleWrap">
            <h1 className="av-hero__title">{t(copy, "availabilityManagement")}</h1>
            <p className="av-hero__subtitle">
              {t(copy, "availabilitySubtitle")}
            </p>
          </div>
          <div className="av-hero__badgeRow">
            <span className="av-chip av-chip--primary">{t(copy, "live")}</span>
            <span className="av-chip av-chip--soft">{t(copy, "adminDashboard")}</span>
          </div>
        </div>

        <div className="av-metrics">
          <div className="av-metric">
            <div className="av-metric__value av-metric__value--primary">
              {totalUsers}
            </div>
            <div className="av-metric__label">{t(copy, "totalUsers")}</div>
          </div>

          <div className="av-metric">
            <div className="av-metric__value av-metric__value--success">
              {usersWithAvailability}
            </div>
            <div className="av-metric__label">{t(copy, "withAvailability")}</div>
          </div>

          <div className="av-metric">
            <div className="av-metric__value av-metric__value--warn">
              {usersWithoutAvailability}
            </div>
            <div className="av-metric__label">{t(copy, "noAvailability")}</div>
          </div>

          <div className="av-metric">
            <div className="av-metric__value av-metric__value--ink">
              {completionRate}%
            </div>
            <div className="av-metric__label">{t(copy, "completionRate")}</div>
          </div>
        </div>

        {summary?.dayDistribution && (
          <div className="av-distribution">
            <div className="av-distribution__title">
              {t(copy, "availabilityByDay")}
            </div>

            <div className="av-bars" role="img" aria-label={t(copy, "dayDistribution")}>
              {localizedDays.map((day) => {
                const count = summary.dayDistribution[day.key] || 0;
                const maxCount = Math.max(
                  ...Object.values(summary.dayDistribution),
                  1
                );
                const height = Math.max(18, (count / maxCount) * 74);

                return (
                  <div key={day.key} className="av-bar">
                    <div className="av-bar__track">
                      <div
                        className="av-bar__fill"
                        style={{ height: `${height}px` }}
                        title={`${day.name}: ${count}`}
                      />
                    </div>
                    <div className="av-bar__day">{day.short}</div>
                    <div className="av-bar__count">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Main Layout */}
      <section className="av-layout">
        {/* Left: Users */}
        <aside className="av-users">
          <div className="av-users__head">
            <div className="av-users__title">{t(copy, "users")}</div>
            <div className="av-users__hint">
              {t(copy, "shown", { count: filteredUsers.length })}
              {roleFilter ? ` • ${roleFilter}` : ""}
            </div>
          </div>

          <div className="av-users__filters">
            <div className="av-field">
              <input
                type="text"
                aria-label={t(copy, "searchAvailability")}
                placeholder={t(copy, "searchAvailabilityPlaceholder")}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="av-input"
              />
            </div>

            <div className="av-segment" role="tablist" aria-label={t(copy, "roleFilter")}>
              <button
                type="button"
                onClick={() => { setRoleFilter(""); setPage(0); }}
                className={`av-segment__btn ${!roleFilter ? "is-active" : ""}`}
              >
                {t(copy, "all")}
              </button>
              <button
                type="button"
                onClick={() => { setRoleFilter("teacher"); setPage(0); }}
                className={`av-segment__btn ${
                  roleFilter === "teacher" ? "is-active" : ""
                }`}
              >
                {t(copy, "teachers")}
              </button>
              <button
                type="button"
                onClick={() => { setRoleFilter("learner"); setPage(0); }}
                className={`av-segment__btn ${
                  roleFilter === "learner" ? "is-active" : ""
                }`}
              >
                {t(copy, "learners")}
              </button>
            </div>

            <label className="av-check">
              <input
                type="checkbox"
                checked={showOnlyWithAvailability}
                onChange={(e) => setShowOnlyWithAvailability(e.target.checked)}
              />
              <span>{t(copy, "onlyWithAvailability")}</span>
            </label>
          </div>

          <div className="av-pagination" aria-label={`${t(copy, "availability")} pagination`}>
            <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>{t(copy, "previous")}</button>
            <span>{t(copy, "page", { page: page + 1 })}</span>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={!summary?.hasMore}>{t(copy, "next")}</button>
          </div>

          <div className="av-users__list">
            {(!roleFilter || roleFilter === "teacher") &&
              usersByRole.teachers.length > 0 && (
                <div className="av-group">
                  <div className="av-group__label av-group__label--teacher">
                    {t(copy, "teachers")} ({usersByRole.teachers.length})
                  </div>
                  {usersByRole.teachers.map((user) => (
                    <UserListItem
                      key={user.id}
                      user={user}
                      copy={copy}
                      isSelected={selectedUser?.id === user.id}
                      onClick={() => handleSelectUser(user)}
                    />
                  ))}
                </div>
              )}

            {(!roleFilter || roleFilter === "learner") &&
              usersByRole.learners.length > 0 && (
                <div className="av-group">
                  <div className="av-group__label av-group__label--learner">
                    {t(copy, "learners")} ({usersByRole.learners.length})
                  </div>
                  {usersByRole.learners.map((user) => (
                    <UserListItem
                      key={user.id}
                      user={user}
                      copy={copy}
                      isSelected={selectedUser?.id === user.id}
                      onClick={() => handleSelectUser(user)}
                    />
                  ))}
                </div>
              )}

            {filteredUsers.length === 0 && (
              <div className="av-empty">{t(copy, "noUsers")}</div>
            )}
          </div>
        </aside>

        {/* Right: Details */}
        <main className="av-detail">
          {!selectedUser ? (
            <div className="av-detail__empty">
              <div className="av-detail__emptyIcon" aria-hidden="true">
                👈
              </div>
              <div className="av-detail__emptyTitle">{t(copy, "selectUser")}</div>
              <p className="av-detail__emptyText">
                {t(copy, "selectUserHint")}
              </p>
            </div>
          ) : userLoading ? (
            <div className="av-detail__loading">
              <Spinner className="av-spinner" />
            </div>
          ) : (
            <>
              {/* User Header */}
              <div className="av-userHead">
                <div className="av-userHead__row">
                  <div className="av-user">
                    <div className="av-user__avatar" aria-hidden="true">
                      {(
                        selectedUser.name?.[0] ||
                        selectedUser.email?.[0] ||
                        "?"
                      ).toUpperCase()}
                    </div>

                    <div className="av-user__meta">
                      <div className="av-user__name">
                        {selectedUser.name || "No Name"}
                      </div>
                      <div className="av-user__email">{selectedUser.email}</div>
                    </div>
                  </div>

                  <div className="av-userHead__tags">
                    <span
                      className={`av-role ${
                        selectedUser.role === "teacher"
                          ? "av-role--teacher"
                          : "av-role--learner"
                      }`}
                    >
                      {selectedUser.role}
                    </span>

                    {selectedUser.timezone && (
                      <span className="av-tz">🌍 {selectedUser.timezone}</span>
                    )}
                  </div>
                </div>

                {userAvailability?.summary && (
                  <div className="av-quick">
                    <div className="av-quick__item">
                      <div className="av-quick__label">{t(copy, "totalSlots")}</div>
                      <div className="av-quick__value">
                        {userAvailability.summary.totalSlots}
                      </div>
                    </div>

                    <div className="av-quick__item">
                      <div className="av-quick__label">{t(copy, "active")}</div>
                      <div className="av-quick__value av-quick__value--success">
                        {userAvailability.summary.activeSlots}
                      </div>
                    </div>

                    <div className="av-quick__item">
                      <div className="av-quick__label">{t(copy, "recurring")}</div>
                      <div className="av-quick__value">
                        {userAvailability.summary.recurringSlots}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* View Toggle */}
              <div className="av-tabs" role="tablist" aria-label={t(copy, "viewMode")}>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`av-tab ${
                    viewMode === "calendar" ? "is-active" : ""
                  }`}
                >
                  {t(copy, "calendarView")}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`av-tab ${viewMode === "list" ? "is-active" : ""}`}
                >
                  {t(copy, "listView")}
                </button>
              </div>

              {/* Calendar View */}
              {viewMode === "calendar" && (
                <div className="av-pane">
                  {!userAvailability?.summary?.activeSlots ? (
                    <div className="av-pane__empty">
                      <div className="av-pane__emptyIcon" aria-hidden="true">
                        📭
                      </div>
                      <div className="av-pane__emptyTitle">
                        {t(copy, "noAvailabilitySet")}
                      </div>
                      <p className="av-pane__emptyText">
                        {t(copy, "noAvailabilityHint")}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="av-grid"
                      style={{
                        gridTemplateColumns: `74px repeat(7, minmax(86px, 1fr))`,
                      }}
                    >
                      {/* Header */}
                      <div className="av-grid__h av-grid__h--time">{t(copy, "time")}</div>
                      {localizedDays.map((day) => (
                        <div key={day.key} className="av-grid__h">
                          {day.short}
                        </div>
                      ))}

                      {/* Body */}
                      {TIME_SLOTS.map((time) => (
                        <FragmentRow
                          key={`row-${time}`}
                          time={time}
                          isCellAvailable={isCellAvailable}
                          days={localizedDays}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* List View */}
              {viewMode === "list" && (
                <div className="av-pane">
                  {!userAvailability?.summary?.activeSlots ? (
                    <div className="av-pane__empty">
                      <div className="av-pane__emptyIcon" aria-hidden="true">
                        📭
                      </div>
                      <div className="av-pane__emptyTitle">
                        {t(copy, "noAvailabilitySet")}
                      </div>
                      <p className="av-pane__emptyText">
                        {t(copy, "noAvailabilityHint")}
                      </p>
                    </div>
                  ) : (
                    <div className="av-days">
                      {localizedDays.map((day) => {
                        const daySlots =
                          userAvailability?.byDayOfWeek?.[day.key]?.filter(
                            (s) => s.status === "active"
                          ) || [];
                        if (daySlots.length === 0) return null;

                        return (
                          <div key={day.key} className="av-dayCard">
                            <div className="av-dayCard__head">
                              <div className="av-dayCard__title">
                                {day.name}
                              </div>
                              <div className="av-dayCard__count">
                                {daySlots.length} {daySlots.length !== 1 ? t(copy, "slots") : t(copy, "slot")}
                              </div>
                            </div>

                            <div className="av-dayCard__body">
                              {daySlots
                                .sort(
                                  (a, b) =>
                                    timeToMinutes(a.startTime) -
                                    timeToMinutes(b.startTime)
                                )
                                .map((slot) => (
                                  <div key={slot.id} className="av-slot">
                                    <span className="av-slot__dot" />
                                    <span className="av-slot__time">
                                      {formatTime12h(slot.startTime)} –{" "}
                                      {formatTime12h(slot.endTime)}
                                    </span>
                                    {slot.note && (
                                      <span className="av-slot__note">
                                        {slot.note}
                                      </span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        );
                      })}

                      {userAvailability?.specificDates?.length > 0 && (
                        <div className="av-dayCard av-dayCard--amber">
                          <div className="av-dayCard__head">
                            <div className="av-dayCard__title">
                              {t(copy, "specificDates")}
                            </div>
                            <div className="av-dayCard__count">
                              {userAvailability.specificDates.length}
                            </div>
                          </div>
                          <div className="av-dayCard__body">
                            {userAvailability.specificDates.map((slot) => (
                              <div
                                key={slot.id}
                                className="av-slot av-slot--amber"
                              >
                                <span className="av-slot__dot" />
                                <span className="av-slot__date">
                                  {new Date(
                                    slot.specificDate
                                  ).toLocaleDateString()}
                                </span>
                                <span className="av-slot__time">
                                  {formatTime12h(slot.startTime)} –{" "}
                                  {formatTime12h(slot.endTime)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </section>
    </div>
  );
}

/**
 * Row fragment for the calendar grid (keeps logic unchanged)
 * NOTE: We avoid React Fragment keys mess by rendering one "row component".
 */
function FragmentRow({ time, isCellAvailable, days }) {
  return (
    <>
      <div className="av-grid__t">{time}</div>
      {days.map((day) => {
        const isAvailable = isCellAvailable(day.key, time);
        return (
          <div
            key={`${day.key}-${time}`}
            className={`av-cell ${isAvailable ? "is-available" : ""}`}
          />
        );
      })}
    </>
  );
}

/**
 * User list item
 */
function UserListItem({ user, isSelected, onClick, copy }) {
  const initial = (user.name?.[0] || user.email?.[0] || "?").toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`av-userItem ${isSelected ? "is-selected" : ""}`}
    >
      <div className="av-userItem__avatar" aria-hidden="true">
        {initial}
      </div>

      <div className="av-userItem__main">
        <div className="av-userItem__name">{user.name || t(copy, "noName")}</div>
        <div className="av-userItem__email">{user.email}</div>
      </div>

      <div className="av-userItem__end">
        {user.hasAvailability ? (
          <span className="av-badge av-badge--success">
            {t(copy, "availabilitySlots", { count: user.availabilityCount })}
          </span>
        ) : (
          <span className="av-badge av-badge--muted">{t(copy, "noAvailability")}</span>
        )}
      </div>
    </button>
  );
}
