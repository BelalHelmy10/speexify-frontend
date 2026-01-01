// components/admin/AdminAvailabilityView.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import Spinner from "@/components/Spinner";

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

  const [summary, setSummary] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAvailability, setUserAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);

  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyWithAvailability, setShowOnlyWithAvailability] =
    useState(false);

  const [viewMode, setViewMode] = useState("summary"); // summary, calendar, list

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/availability/summary", {
        params: { role: roleFilter || undefined },
      });
      setSummary(data);
    } catch (err) {
      console.error("Failed to load availability summary:", err);
      toast?.error?.("Failed to load availability data");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, toast]);

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
      toast?.error?.("Failed to load user availability");
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
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = user.name?.toLowerCase().includes(query);
        const emailMatch = user.email?.toLowerCase().includes(query);
        if (!nameMatch && !emailMatch) return false;
      }

      if (showOnlyWithAvailability && !user.hasAvailability) {
        return false;
      }

      // NOTE: role filtering is performed by the API param,
      // but also keep UI grouping working if API returns all.
      if (roleFilter && user.role !== roleFilter) return false;

      return true;
    });
  }, [summary?.users, searchQuery, showOnlyWithAvailability, roleFilter]);

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
            <h1 className="av-hero__title">Availability Management</h1>
            <p className="av-hero__subtitle">
              Monitor learner and teacher availability schedules at a glance.
            </p>
          </div>
          <div className="av-hero__badgeRow">
            <span className="av-chip av-chip--primary">Live</span>
            <span className="av-chip av-chip--soft">Admin Dashboard</span>
          </div>
        </div>

        <div className="av-metrics">
          <div className="av-metric">
            <div className="av-metric__value av-metric__value--primary">
              {totalUsers}
            </div>
            <div className="av-metric__label">Total Users</div>
          </div>

          <div className="av-metric">
            <div className="av-metric__value av-metric__value--success">
              {usersWithAvailability}
            </div>
            <div className="av-metric__label">With Availability</div>
          </div>

          <div className="av-metric">
            <div className="av-metric__value av-metric__value--warn">
              {usersWithoutAvailability}
            </div>
            <div className="av-metric__label">No Availability</div>
          </div>

          <div className="av-metric">
            <div className="av-metric__value av-metric__value--ink">
              {completionRate}%
            </div>
            <div className="av-metric__label">Completion Rate</div>
          </div>
        </div>

        {summary?.dayDistribution && (
          <div className="av-distribution">
            <div className="av-distribution__title">
              Availability by Day of Week
            </div>

            <div className="av-bars" role="img" aria-label="Day distribution">
              {DAYS.map((day) => {
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
            <div className="av-users__title">Users</div>
            <div className="av-users__hint">
              {filteredUsers.length} shown
              {roleFilter ? ` • ${roleFilter}` : ""}
            </div>
          </div>

          <div className="av-users__filters">
            <div className="av-field">
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="av-input"
              />
            </div>

            <div className="av-segment" role="tablist" aria-label="Role filter">
              <button
                type="button"
                onClick={() => setRoleFilter("")}
                className={`av-segment__btn ${!roleFilter ? "is-active" : ""}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("teacher")}
                className={`av-segment__btn ${
                  roleFilter === "teacher" ? "is-active" : ""
                }`}
              >
                Teachers
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter("learner")}
                className={`av-segment__btn ${
                  roleFilter === "learner" ? "is-active" : ""
                }`}
              >
                Learners
              </button>
            </div>

            <label className="av-check">
              <input
                type="checkbox"
                checked={showOnlyWithAvailability}
                onChange={(e) => setShowOnlyWithAvailability(e.target.checked)}
              />
              <span>Show only users with availability</span>
            </label>
          </div>

          <div className="av-users__list">
            {(!roleFilter || roleFilter === "teacher") &&
              usersByRole.teachers.length > 0 && (
                <div className="av-group">
                  <div className="av-group__label av-group__label--teacher">
                    Teachers ({usersByRole.teachers.length})
                  </div>
                  {usersByRole.teachers.map((user) => (
                    <UserListItem
                      key={user.id}
                      user={user}
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
                    Learners ({usersByRole.learners.length})
                  </div>
                  {usersByRole.learners.map((user) => (
                    <UserListItem
                      key={user.id}
                      user={user}
                      isSelected={selectedUser?.id === user.id}
                      onClick={() => handleSelectUser(user)}
                    />
                  ))}
                </div>
              )}

            {filteredUsers.length === 0 && (
              <div className="av-empty">No users found</div>
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
              <div className="av-detail__emptyTitle">Select a user</div>
              <p className="av-detail__emptyText">
                Choose someone from the left panel to view their availability.
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
                      <div className="av-quick__label">Total Slots</div>
                      <div className="av-quick__value">
                        {userAvailability.summary.totalSlots}
                      </div>
                    </div>

                    <div className="av-quick__item">
                      <div className="av-quick__label">Active</div>
                      <div className="av-quick__value av-quick__value--success">
                        {userAvailability.summary.activeSlots}
                      </div>
                    </div>

                    <div className="av-quick__item">
                      <div className="av-quick__label">Recurring</div>
                      <div className="av-quick__value">
                        {userAvailability.summary.recurringSlots}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* View Toggle */}
              <div className="av-tabs" role="tablist" aria-label="View mode">
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`av-tab ${
                    viewMode === "calendar" ? "is-active" : ""
                  }`}
                >
                  Calendar View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`av-tab ${viewMode === "list" ? "is-active" : ""}`}
                >
                  List View
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
                        No availability set
                      </div>
                      <p className="av-pane__emptyText">
                        This user hasn’t added any active time slots.
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
                      <div className="av-grid__h av-grid__h--time">Time</div>
                      {DAYS.map((day) => (
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
                        No availability set
                      </div>
                      <p className="av-pane__emptyText">
                        This user hasn’t added any active time slots.
                      </p>
                    </div>
                  ) : (
                    <div className="av-days">
                      {DAYS.map((day) => {
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
                                {daySlots.length} slot
                                {daySlots.length !== 1 ? "s" : ""}
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
                              Specific Dates
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
function FragmentRow({ time, isCellAvailable }) {
  return (
    <>
      <div className="av-grid__t">{time}</div>
      {DAYS.map((day) => {
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
function UserListItem({ user, isSelected, onClick }) {
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
        <div className="av-userItem__name">{user.name || "No Name"}</div>
        <div className="av-userItem__email">{user.email}</div>
      </div>

      <div className="av-userItem__end">
        {user.hasAvailability ? (
          <span className="av-badge av-badge--success">
            {user.availabilityCount} slots
          </span>
        ) : (
          <span className="av-badge av-badge--muted">No availability</span>
        )}
      </div>
    </button>
  );
}
