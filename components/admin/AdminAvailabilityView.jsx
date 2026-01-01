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

/**
 * Parse time string to minutes since midnight
 */
function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Format time for display (12h format)
 */
function formatTime12h(time24) {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Check if a time slot falls within an availability range
 */
function isSlotInRange(slotTime, startTime, endTime) {
  const slot = timeToMinutes(slotTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return slot >= start && slot < end;
}

/**
 * AdminAvailabilityView - View and manage all users' availability
 */
export default function AdminAvailabilityView() {
  const toast = useToast();

  // Data states
  const [summary, setSummary] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAvailability, setUserAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);

  // Filters
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyWithAvailability, setShowOnlyWithAvailability] =
    useState(false);

  // View modes
  const [viewMode, setViewMode] = useState("summary"); // summary, calendar, list

  // Fetch summary data
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

  // Fetch specific user's availability
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

  // Select a user to view
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    fetchUserAvailability(user.id);
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!summary?.users) return [];

    return summary.users.filter((user) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = user.name?.toLowerCase().includes(query);
        const emailMatch = user.email?.toLowerCase().includes(query);
        if (!nameMatch && !emailMatch) return false;
      }

      // Show only with availability filter
      if (showOnlyWithAvailability && !user.hasAvailability) {
        return false;
      }

      return true;
    });
  }, [summary?.users, searchQuery, showOnlyWithAvailability]);

  // Group users by role
  const usersByRole = useMemo(() => {
    const teachers = filteredUsers.filter((u) => u.role === "teacher");
    const learners = filteredUsers.filter((u) => u.role === "learner");
    return { teachers, learners };
  }, [filteredUsers]);

  // Check if a cell is available for the selected user
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
          <h1 className="text-2xl font-bold text-gray-900">
            Availability Management
          </h1>
          <p className="text-gray-600 mt-1">
            View and monitor learner and teacher availability schedules
          </p>
        </div>

        {/* Summary Stats */}
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50">
          <div className="text-center">
            <div className="text-3xl font-bold text-violet-600">
              {summary?.totalUsers || 0}
            </div>
            <div className="text-sm text-gray-500">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">
              {summary?.usersWithAvailability || 0}
            </div>
            <div className="text-sm text-gray-500">With Availability</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600">
              {summary?.usersWithoutAvailability || 0}
            </div>
            <div className="text-sm text-gray-500">No Availability</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {summary?.usersWithAvailability && summary?.totalUsers
                ? Math.round(
                    (summary.usersWithAvailability / summary.totalUsers) * 100
                  )
                : 0}
              %
            </div>
            <div className="text-sm text-gray-500">Completion Rate</div>
          </div>
        </div>

        {/* Day Distribution */}
        {summary?.dayDistribution && (
          <div className="px-6 py-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Availability by Day of Week
            </h3>
            <div className="flex gap-2">
              {DAYS.map((day) => {
                const count = summary.dayDistribution[day.key] || 0;
                const maxCount = Math.max(
                  ...Object.values(summary.dayDistribution),
                  1
                );
                const height = Math.max(20, (count / maxCount) * 60);

                return (
                  <div key={day.key} className="flex-1 text-center">
                    <div className="h-16 flex items-end justify-center">
                      <div
                        className="w-full max-w-[40px] bg-violet-500 rounded-t transition-all"
                        style={{ height: `${height}px` }}
                      />
                    </div>
                    <div className="text-xs font-medium text-gray-600 mt-1">
                      {day.short}
                    </div>
                    <div className="text-xs text-gray-400">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Users</h2>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            {/* Search */}
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />

            {/* Role filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setRoleFilter("")}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  !roleFilter
                    ? "bg-violet-100 text-violet-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setRoleFilter("teacher")}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  roleFilter === "teacher"
                    ? "bg-violet-100 text-violet-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Teachers
              </button>
              <button
                onClick={() => setRoleFilter("learner")}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  roleFilter === "learner"
                    ? "bg-violet-100 text-violet-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Learners
              </button>
            </div>

            {/* Show only with availability */}
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showOnlyWithAvailability}
                onChange={(e) => setShowOnlyWithAvailability(e.target.checked)}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              Show only users with availability
            </label>
          </div>

          {/* User list */}
          <div className="max-h-[500px] overflow-y-auto">
            {/* Teachers Section */}
            {(!roleFilter || roleFilter === "teacher") &&
              usersByRole.teachers.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-blue-50 text-xs font-semibold text-blue-700 uppercase tracking-wide">
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

            {/* Learners Section */}
            {(!roleFilter || roleFilter === "learner") &&
              usersByRole.learners.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-emerald-50 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
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
              <div className="p-6 text-center text-gray-500">
                No users found
              </div>
            )}
          </div>
        </div>

        {/* User Details / Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {!selectedUser ? (
            <div className="h-full flex items-center justify-center text-gray-500 py-20">
              <div className="text-center">
                <div className="text-5xl mb-4">👈</div>
                <p>Select a user to view their availability</p>
              </div>
            </div>
          ) : userLoading ? (
            <div className="h-full flex items-center justify-center py-20">
              <Spinner className="w-8 h-8" />
            </div>
          ) : (
            <>
              {/* User Header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-lg">
                      {selectedUser.name?.[0]?.toUpperCase() ||
                        selectedUser.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        {selectedUser.name || "No Name"}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        selectedUser.role === "teacher"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {selectedUser.role}
                    </span>
                    {selectedUser.timezone && (
                      <span className="text-sm text-gray-500">
                        🌍 {selectedUser.timezone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                {userAvailability?.summary && (
                  <div className="flex gap-6 mt-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Slots:</span>{" "}
                      <span className="font-semibold">
                        {userAvailability.summary.totalSlots}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Active:</span>{" "}
                      <span className="font-semibold text-emerald-600">
                        {userAvailability.summary.activeSlots}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Recurring:</span>{" "}
                      <span className="font-semibold">
                        {userAvailability.summary.recurringSlots}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* View Toggle */}
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    viewMode === "calendar"
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Calendar View
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  List View
                </button>
              </div>

              {/* Calendar View */}
              {viewMode === "calendar" && (
                <div className="p-4 overflow-x-auto">
                  {!userAvailability?.summary?.activeSlots ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-4xl mb-3">📭</div>
                      <p>This user has no availability set</p>
                    </div>
                  ) : (
                    <div
                      className="grid gap-px bg-gray-200 rounded-lg overflow-hidden"
                      style={{
                        gridTemplateColumns: `60px repeat(7, minmax(80px, 1fr))`,
                      }}
                    >
                      {/* Header */}
                      <div className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-500">
                        Time
                      </div>
                      {DAYS.map((day) => (
                        <div
                          key={day.key}
                          className="bg-gray-50 p-2 text-center text-xs font-semibold text-gray-700"
                        >
                          {day.short}
                        </div>
                      ))}

                      {/* Time slots */}
                      {TIME_SLOTS.map((time) => (
                        <>
                          <div
                            key={`time-${time}`}
                            className="bg-gray-50 p-1 text-center text-[10px] text-gray-500 font-mono"
                          >
                            {time}
                          </div>
                          {DAYS.map((day) => {
                            const isAvailable = isCellAvailable(day.key, time);
                            return (
                              <div
                                key={`${day.key}-${time}`}
                                className={`min-h-[20px] ${
                                  isAvailable ? "bg-emerald-500" : "bg-white"
                                }`}
                              />
                            );
                          })}
                        </>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* List View */}
              {viewMode === "list" && (
                <div className="p-4">
                  {!userAvailability?.summary?.activeSlots ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-4xl mb-3">📭</div>
                      <p>This user has no availability set</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {DAYS.map((day) => {
                        const daySlots =
                          userAvailability?.byDayOfWeek?.[day.key]?.filter(
                            (s) => s.status === "active"
                          ) || [];
                        if (daySlots.length === 0) return null;

                        return (
                          <div
                            key={day.key}
                            className="border border-gray-100 rounded-xl overflow-hidden"
                          >
                            <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                              <h4 className="font-semibold text-gray-900">
                                {day.name}
                              </h4>
                              <span className="text-sm text-gray-500">
                                {daySlots.length} slot
                                {daySlots.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {daySlots
                                .sort(
                                  (a, b) =>
                                    timeToMinutes(a.startTime) -
                                    timeToMinutes(b.startTime)
                                )
                                .map((slot) => (
                                  <div
                                    key={slot.id}
                                    className="px-4 py-3 flex items-center gap-3"
                                  >
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                    <span className="font-medium text-gray-900">
                                      {formatTime12h(slot.startTime)} -{" "}
                                      {formatTime12h(slot.endTime)}
                                    </span>
                                    {slot.note && (
                                      <span className="text-sm text-gray-500">
                                        ({slot.note})
                                      </span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Specific dates */}
                      {userAvailability?.specificDates?.length > 0 && (
                        <div className="border border-amber-100 rounded-xl overflow-hidden">
                          <div className="bg-amber-50 px-4 py-2">
                            <h4 className="font-semibold text-amber-900">
                              Specific Dates
                            </h4>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {userAvailability.specificDates.map((slot) => (
                              <div
                                key={slot.id}
                                className="px-4 py-3 flex items-center gap-3"
                              >
                                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                                <span className="text-sm text-gray-500">
                                  {new Date(
                                    slot.specificDate
                                  ).toLocaleDateString()}
                                </span>
                                <span className="font-medium text-gray-900">
                                  {formatTime12h(slot.startTime)} -{" "}
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
        </div>
      </div>
    </div>
  );
}

/**
 * User list item component
 */
function UserListItem({ user, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
        isSelected
          ? "bg-violet-50 border-l-4 border-violet-500"
          : "hover:bg-gray-50 border-l-4 border-transparent"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {user.name || "No Name"}
        </div>
        <div className="text-sm text-gray-500 truncate">{user.email}</div>
      </div>
      <div className="flex items-center gap-2">
        {user.hasAvailability ? (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            {user.availabilityCount} slots
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
            No availability
          </span>
        )}
      </div>
    </button>
  );
}
