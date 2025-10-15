// web/src/pages/Settings.jsx
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import "@/styles/settings.scss";

const timezones = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "America/Denver",
  "Australia/Sydney",
];

export default function Settings() {
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwStatus, setPwStatus] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/me");
        setMe(res.data);
      } catch (e) {
        setStatus(e.response?.data?.error || "Failed to load profile");
      }
    })();
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setStatus("Saving...");
    setSaveSuccess(false);
    try {
      const payload = { name: me.name || "", timezone: me.timezone || "" };
      const res = await api.patch("/api/me", payload);
      setMe(res.data);
      setStatus("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setStatus(e.response?.data?.error || "Failed to save");
      setSaveSuccess(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwStatus("Saving...");
    setPwSuccess(false);
    try {
      await api.post("/api/me/password", {
        currentPassword,
        newPassword,
      });
      setPwStatus("");
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err) {
      setPwStatus(err.response?.data?.error || "Failed to change password");
      setPwSuccess(false);
    }
  };

  if (!me) {
    return (
      <div className="settings-modern">
        <div className="settings-loading">
          <div className="spinner" />
          <p>{status || "Loading settings..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-modern">
      <div className="settings-container">
        {/* Header */}
        <div className="settings-header">
          <div className="settings-header__content">
            <h1 className="settings-title">
              Settings
              <span className="settings-subtitle">
                Manage your account preferences and security
              </span>
            </h1>
          </div>
          <div className="settings-header__badge">
            <div className="user-avatar-large">
              {me.name?.charAt(0) || me.email?.charAt(0) || "U"}
            </div>
          </div>
        </div>

        {/* Profile Information Card */}
        <div className="settings-card">
          <div className="settings-card__header">
            <div className="settings-card__icon settings-card__icon--primary">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="settings-card__title">Profile Information</h2>
              <p className="settings-card__description">
                Update your personal details and preferences
              </p>
            </div>
          </div>

          <form onSubmit={onSave} className="settings-form">
            <div className="form-group">
              <label className="form-label">
                Email Address
                <span className="form-hint">
                  Your account email (read-only)
                </span>
              </label>
              <div className="form-input-wrapper">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="input-icon"
                >
                  <path
                    d="M3 4H17C17.5523 4 18 4.44772 18 5V15C18 15.5523 17.5523 16 17 16H3C2.44772 16 2 15.5523 2 15V5C2 4.44772 2.44772 4 3 4Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M18 5L10 11L2 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  type="text"
                  className="form-input"
                  value={me.email || ""}
                  disabled
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Full Name
                <span className="form-hint">
                  How you'd like to be addressed
                </span>
              </label>
              <div className="form-input-wrapper">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="input-icon"
                >
                  <circle
                    cx="10"
                    cy="6"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M3 17C3 14 6 12 10 12C14 12 17 14 17 17"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type="text"
                  className="form-input"
                  value={me.name || ""}
                  onChange={(e) =>
                    setMe((m) => ({ ...m, name: e.target.value }))
                  }
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Time Zone
                <span className="form-hint">
                  Used for scheduling and notifications
                </span>
              </label>
              <div className="form-input-wrapper">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="input-icon"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M10 5V10L13 12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <select
                  className="form-select"
                  value={me.timezone || ""}
                  onChange={(e) =>
                    setMe((m) => ({ ...m, timezone: e.target.value }))
                  }
                >
                  <option value="">(Use browser default)</option>
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={!!status}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M13.5 4L6 11.5L2.5 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {status || "Save Changes"}
              </button>
              {saveSuccess && (
                <div className="success-message">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle
                      cx="8"
                      cy="8"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M5 8L7 10L11 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Profile updated successfully
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Security Card */}
        <div className="settings-card">
          <div className="settings-card__header">
            <div className="settings-card__icon settings-card__icon--warning">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect
                  x="5"
                  y="11"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M12 15V17M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <h2 className="settings-card__title">Security</h2>
              <p className="settings-card__description">
                Keep your account secure by updating your password regularly
              </p>
            </div>
          </div>

          <form onSubmit={changePassword} className="settings-form">
            <div className="form-group">
              <label className="form-label">
                Current Password
                <span className="form-hint">Enter your existing password</span>
              </label>
              <div className="form-input-wrapper">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="input-icon"
                >
                  <rect
                    x="4"
                    y="9"
                    width="12"
                    height="8"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M7 9V6C7 4.34315 8.34315 3 10 3C11.6569 3 13 4.34315 13 6V9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                New Password
                <span className="form-hint">Must be at least 8 characters</span>
              </label>
              <div className="form-input-wrapper">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="input-icon"
                >
                  <path
                    d="M10 2C11.1046 2 12 2.89543 12 4V7H14C15.1046 7 16 7.89543 16 9V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V9C4 7.89543 4.89543 7 6 7H8V4C8 2.89543 8.89543 2 10 2Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle cx="10" cy="12" r="1.5" fill="currentColor" />
                </svg>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-warning"
                disabled={!!pwStatus}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2V8M8 8V14M8 8H14M8 8H2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                {pwStatus || "Update Password"}
              </button>
              {pwSuccess && (
                <div className="success-message">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle
                      cx="8"
                      cy="8"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M5 8L7 10L11 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Password changed successfully
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Account Info Card */}
        <div className="settings-card settings-card--info">
          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M10 6V10L12.5 12.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="info-item__content">
                <div className="info-item__label">Account Role</div>
                <div className="info-item__value">{me.role || "User"}</div>
              </div>
            </div>

            <div className="info-item">
              <div className="info-item__icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect
                    x="3"
                    y="4"
                    width="14"
                    height="12"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M3 8H17M7 2V6M13 2V6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="info-item__content">
                <div className="info-item__label">Member Since</div>
                <div className="info-item__value">
                  {new Date(me.createdAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
