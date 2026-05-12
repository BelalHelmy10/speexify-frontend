// app/settings/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  Database,
  Download,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Monitor,
  PackageCheck,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
} from "lucide-react";
import api from "@/lib/api";
import "@/styles/settings.scss";
import useAuth from "@/hooks/useAuth";
import { getDictionary, t } from "@/app/i18n";
import { getSupportedTimezones } from "../../lib/timezones";

const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailSessionReminders: true,
  emailSessionChanges: true,
  inAppSessionReminders: true,
  weeklyProgressDigest: true,
  productUpdates: false,
  reminderLeadTime: "24h",
};

const SECTION_IDS = [
  "profile",
  "security",
  "notifications",
  "calendar",
  "privacy",
  "plan",
  "devices",
];

function getApiError(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}

function formatDate(value, locale) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function formatDateTime(value, locale) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function buildPasswordChecks(password) {
  return {
    length: password.length >= 8,
    mixed: /[A-Za-z]/.test(password) && /[0-9]/.test(password),
    strongLength: password.length >= 12,
  };
}

function getPasswordScore(password) {
  const checks = buildPasswordChecks(password);
  return Object.values(checks).filter(Boolean).length;
}

function StatusMessage({ type = "info", children }) {
  if (!children) return null;
  const Icon = type === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`settings-status settings-status--${type}`}>
      <Icon size={16} />
      <span>{children}</span>
    </div>
  );
}

function SettingsCard({ id, eyebrow, title, description, icon: Icon, children }) {
  return (
    <section id={id} className="settings-card">
      <div className="settings-card__header">
        <div className="settings-card__icon">
          <Icon size={21} />
        </div>
        <div>
          {eyebrow ? <p className="settings-card__eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function ToggleRow({ icon: Icon, label, description, checked, onChange }) {
  return (
    <label className="settings-toggle-row">
      <span className="settings-toggle-row__icon">
        <Icon size={18} />
      </span>
      <span className="settings-toggle-row__copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="settings-switch" aria-hidden="true" />
    </label>
  );
}

export default function SettingsPage() {
  const { user, checking, refresh } = useAuth();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = useMemo(() => getDictionary(locale, "settings"), [locale]);

  const copyText = (key, fallback, vars) => {
    const value = t(dict, key, vars);
    return value === `__${key}__` ? fallback : value;
  };

  const [activeSection, setActiveSection] = useState("profile");
  const [me, setMe] = useState(null);
  const [packages, setPackages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [privacyRequests, setPrivacyRequests] = useState([]);
  const [notifications, setNotifications] = useState(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationsSuccess, setNotificationsSuccess] = useState("");

  const [calendarUrls, setCalendarUrls] = useState(null);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [calendarSuccess, setCalendarSuccess] = useState("");
  const [copiedCalendarField, setCopiedCalendarField] = useState("");

  const [privacyBusy, setPrivacyBusy] = useState("");
  const [privacyError, setPrivacyError] = useState("");
  const [privacySuccess, setPrivacySuccess] = useState("");

  useEffect(() => {
    if (checking || !user) return;

    let ignore = false;
    async function loadSettings() {
      setInitialLoading(true);
      setLoadError("");
      try {
        const [meRes, packageRes, summaryRes, privacyRes, notificationRes] =
          await Promise.allSettled([
            api.get("/me"),
            api.get("/me/packages"),
            api.get("/me/summary"),
            api.get("/privacy/me/requests"),
            api.get("/me/notification-preferences"),
          ]);

        if (ignore) return;

        if (meRes.status === "fulfilled") {
          setMe(meRes.value.data);
        } else {
          throw meRes.reason;
        }

        setPackages(
          packageRes.status === "fulfilled" ? packageRes.value.data || [] : []
        );
        setSummary(
          summaryRes.status === "fulfilled" ? summaryRes.value.data : null
        );
        setPrivacyRequests(
          privacyRes.status === "fulfilled"
            ? privacyRes.value.data?.items || []
            : []
        );
        setNotifications({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...(notificationRes.status === "fulfilled"
            ? notificationRes.value.data || {}
            : {}),
        });
      } catch (error) {
        if (!ignore) {
          setLoadError(getApiError(error, copyText("loading_settings", "Failed to load settings")));
        }
      } finally {
        if (!ignore) setInitialLoading(false);
      }
    }

    loadSettings();
    return () => {
      ignore = true;
    };
  }, [checking, user, dict]);

  const sectionLabels = useMemo(
    () => ({
      profile: copyText("nav_profile", "Profile"),
      security: copyText("nav_security", "Security"),
      notifications: copyText("nav_notifications", "Notifications"),
      calendar: copyText("nav_calendar", "Calendar Sync"),
      privacy: copyText("nav_privacy", "Privacy & Data"),
      plan: copyText("nav_plan", "Plan"),
      devices: copyText("nav_devices", "Devices"),
    }),
    [dict]
  );

  const passwordChecks = buildPasswordChecks(newPassword);
  const passwordScore = getPasswordScore(newPassword);
  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const passwordReady =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    passwordChecks.length &&
    passwordChecks.mixed &&
    !passwordMismatch;

  const activePackages = packages.filter(
    (item) => item.status === "active" && !item.expired
  );
  const packageTotals = packages.reduce(
    (acc, item) => {
      acc.total += Number(item.sessionsTotal || 0);
      acc.used += Number(item.sessionsUsed || 0);
      acc.remaining += Number(item.remaining || 0);
      return acc;
    },
    { total: 0, used: 0, remaining: 0 }
  );

  async function onSaveProfile(event) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const res = await api.patch("/me", {
        name: me.name || "",
        timezone: me.timezone || "",
        language: me.language || locale,
      });
      setMe(res.data);
      await refresh();
      setProfileSuccess(copyText("save_success", "Profile updated successfully"));
    } catch (error) {
      setProfileError(getApiError(error, copyText("profile_error", "Failed to save profile")));
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (!passwordReady) return;

    setPasswordSaving(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      await api.post("/me/password", { currentPassword, newPassword });
      setPasswordSuccess(copyText("pw_success", "Password changed successfully"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setMe((current) =>
        current ? { ...current, passwordChangedAt: new Date().toISOString() } : current
      );
    } catch (error) {
      setPasswordError(
        getApiError(error, copyText("password_error", "Failed to change password"))
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  async function saveNotificationPreferences(nextPreferences = notifications) {
    setNotificationsSaving(true);
    setNotificationsError("");
    setNotificationsSuccess("");

    try {
      const res = await api.patch("/me/notification-preferences", nextPreferences);
      setNotifications({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(res.data || nextPreferences),
      });
      setNotificationsSuccess(copyText("notifications_saved", "Notification preferences saved"));
    } catch (error) {
      setNotificationsError(
        getApiError(error, copyText("notifications_error", "Failed to save notification preferences"))
      );
    } finally {
      setNotificationsSaving(false);
    }
  }

  function updateNotificationPreference(key, value) {
    setNotifications((current) => ({ ...current, [key]: value }));
  }

  async function loadCalendarExportLink() {
    setCalendarBusy(true);
    setCalendarError("");
    setCalendarSuccess("");
    try {
      const res = await api.get("/calendar/export-link", {
        params: { t: Date.now() },
        headers: { "Cache-Control": "no-store" },
      });
      setCalendarUrls(res.data);
      setCalendarSuccess(copyText("calendar_generated", "Calendar feed link is ready"));
    } catch (error) {
      setCalendarError(getApiError(error, copyText("calendar_error", "Failed to generate calendar link")));
    } finally {
      setCalendarBusy(false);
    }
  }

  async function revokeCalendarExportLink() {
    setCalendarBusy(true);
    setCalendarError("");
    setCalendarSuccess("");

    try {
      const res = await api.post("/calendar/export-link/revoke");
      setCalendarUrls(null);
      setMe((current) =>
        current
          ? { ...current, calendarFeedRevokedAt: res.data?.revokedAt || new Date().toISOString() }
          : current
      );
      setCalendarSuccess(copyText("calendar_revoked", "Previous calendar feed links were revoked"));
    } catch (error) {
      setCalendarError(getApiError(error, copyText("calendar_revoke_error", "Failed to revoke calendar links")));
    } finally {
      setCalendarBusy(false);
    }
  }

  async function copyToClipboard(value, field) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedCalendarField(field);
      setTimeout(() => setCopiedCalendarField(""), 1600);
    } catch {
      setCalendarError(copyText("calendar_copy_error", "Browser blocked clipboard access"));
    }
  }

  async function exportData() {
    setPrivacyBusy("export");
    setPrivacyError("");
    setPrivacySuccess("");

    try {
      const res = await api.get("/privacy/me/export", {
        headers: { "Cache-Control": "no-store" },
      });
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `speexify-data-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPrivacySuccess(copyText("privacy_export_ready", "Your data export was prepared"));
    } catch (error) {
      setPrivacyError(getApiError(error, copyText("privacy_export_error", "Failed to export data")));
    } finally {
      setPrivacyBusy("");
    }
  }

  async function requestDeletion() {
    setPrivacyBusy("delete");
    setPrivacyError("");
    setPrivacySuccess("");

    try {
      const res = await api.post("/privacy/me/requests", {
        type: "DELETE",
        reason: "Requested from account settings.",
      });
      const privacyRes = await api.get("/privacy/me/requests");
      setPrivacyRequests(privacyRes.data?.items || []);
      setPrivacySuccess(
        res.data?.created
          ? copyText("privacy_delete_requested", "Account deletion request submitted")
          : copyText("privacy_delete_existing", "You already have an open privacy request")
      );
    } catch (error) {
      setPrivacyError(getApiError(error, copyText("privacy_delete_error", "Failed to submit deletion request")));
    } finally {
      setPrivacyBusy("");
    }
  }

  function jumpToSection(sectionId) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (checking) {
    return (
      <main className="settings-modern">
        <div className="settings-loading">
          <Loader2 className="settings-loading__spinner" size={34} />
          <p>{copyText("loading_generic", "Loading...")}</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="settings-modern">
        <div className="settings-loading">
          <AlertCircle size={32} />
          <p>{copyText("not_authenticated", "Not authenticated")}</p>
        </div>
      </main>
    );
  }

  if (initialLoading) {
    return (
      <main className="settings-modern">
        <div className="settings-loading">
          <Loader2 className="settings-loading__spinner" size={34} />
          <p>{copyText("loading_generic", "Loading...")}</p>
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="settings-modern">
        <div className="settings-loading">
          <AlertCircle size={32} />
          <p>{loadError || copyText("loading_settings", "Failed to load settings")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="settings-modern">
      <div className="settings-shell">
        <aside className="settings-rail" aria-label={copyText("settings_nav", "Settings navigation")}>
          <div className="settings-rail__profile">
            <div className="settings-avatar">
              {(me.name || me.email || "U").charAt(0)}
            </div>
            <div>
              <strong>{me.name || copyText("unnamed_user", "Unnamed user")}</strong>
              <span>{me.email}</span>
            </div>
          </div>

          <nav className="settings-nav">
            {SECTION_IDS.map((sectionId) => (
              <button
                key={sectionId}
                type="button"
                className={activeSection === sectionId ? "is-active" : ""}
                onClick={() => jumpToSection(sectionId)}
              >
                <span>{sectionLabels[sectionId]}</span>
                <ChevronRight size={16} />
              </button>
            ))}
          </nav>
        </aside>

        <div className="settings-content">
          <header className="settings-hero">
            <div>
              <p className="settings-hero__eyebrow">{copyText("hero_eyebrow", "Account command center")}</p>
              <h1>{copyText("title", "Settings")}</h1>
              <p>{copyText("subtitle", "Manage your account preferences and security")}</p>
            </div>
            <div className="settings-hero__meta">
              <span>{copyText("role_label", "Account Role")}</span>
              <strong>{me.role || copyText("role_default", "User")}</strong>
            </div>
          </header>

          <div className="settings-summary-grid">
            <div className="settings-summary-card">
              <CalendarDays size={20} />
              <span>{copyText("next_session_label", "Next session")}</span>
              <strong>
                {summary?.nextSession
                  ? formatDateTime(summary.nextSession.startAt, locale)
                  : copyText("no_session_scheduled", "No session scheduled")}
              </strong>
            </div>
            <div className="settings-summary-card">
              <PackageCheck size={20} />
              <span>{copyText("credits_label", "Credits")}</span>
              <strong>{packageTotals.remaining}</strong>
            </div>
            <div className="settings-summary-card">
              <ShieldCheck size={20} />
              <span>{copyText("security_status_label", "Security")}</span>
              <strong>
                {me.passwordChangedAt
                  ? copyText("security_updated", "Updated")
                  : copyText("security_review", "Review")}
              </strong>
            </div>
          </div>

          <SettingsCard
            id="profile"
            eyebrow={copyText("profile_eyebrow", "Identity")}
            title={copyText("profile_title", "Profile Information")}
            description={copyText("profile_description", "Update your personal details and preferences")}
            icon={UserRound}
          >
            <form onSubmit={onSaveProfile} className="settings-form">
              <div className="settings-field-grid">
                <label className="settings-field">
                  <span>{copyText("email_label", "Email Address")}</span>
                  <small>{copyText("email_hint", "Your account email is read-only")}</small>
                  <input value={me.email || ""} disabled />
                </label>

                <label className="settings-field">
                  <span>{copyText("name_label", "Full Name")}</span>
                  <small>{copyText("name_hint", "How you would like to be addressed")}</small>
                  <input
                    value={me.name || ""}
                    onChange={(event) =>
                      setMe((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>

                <label className="settings-field">
                  <span>{copyText("timezone_label", "Time Zone")}</span>
                  <small>{copyText("timezone_hint", "Used for scheduling and notifications")}</small>
                  <select
                    value={me.timezone || ""}
                    onChange={(event) =>
                      setMe((current) => ({ ...current, timezone: event.target.value }))
                    }
                  >
                    <option value="">{copyText("timezone_default_option", "Use browser default")}</option>
                    {getSupportedTimezones().map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="settings-field">
                  <span>{copyText("language_label", "Language")}</span>
                  <small>{copyText("language_hint", "Used for account and product messaging")}</small>
                  <select
                    value={me.language || locale}
                    onChange={(event) =>
                      setMe((current) => ({ ...current, language: event.target.value }))
                    }
                  >
                    <option value="en">{copyText("language_en", "English")}</option>
                    <option value="ar">{copyText("language_ar", "Arabic")}</option>
                  </select>
                </label>
              </div>

              <div className="settings-actions">
                <button type="submit" className="settings-btn settings-btn--primary" disabled={profileSaving}>
                  {profileSaving ? <Loader2 size={16} className="settings-spin" /> : <Save size={16} />}
                  {profileSaving ? copyText("status_saving", "Saving...") : copyText("save_button", "Save Changes")}
                </button>
                <StatusMessage type="success">{profileSuccess}</StatusMessage>
                <StatusMessage type="error">{profileError}</StatusMessage>
              </div>
            </form>
          </SettingsCard>

          <SettingsCard
            id="security"
            eyebrow={copyText("security_eyebrow", "Access")}
            title={copyText("security_title", "Security")}
            description={copyText("security_description", "Keep your account secure by updating your password regularly")}
            icon={LockKeyhole}
          >
            <form onSubmit={changePassword} className="settings-form">
              <div className="settings-security-meta">
                <div>
                  <span>{copyText("password_last_changed", "Password last changed")}</span>
                  <strong>{formatDate(me.passwordChangedAt, locale)}</strong>
                </div>
                <div>
                  <span>{copyText("session_device", "Current session")}</span>
                  <strong>{copyText("browser_session", "This browser")}</strong>
                </div>
              </div>

              <div className="settings-field-grid">
                <label className="settings-field settings-field--password">
                  <span>{copyText("current_password_label", "Current Password")}</span>
                  <small>{copyText("current_password_hint", "Enter your existing password")}</small>
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((value) => !value)}
                    aria-label={copyText("toggle_current_password", "Toggle current password visibility")}
                  >
                    {showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </label>

                <label className="settings-field settings-field--password">
                  <span>{copyText("new_password_label", "New Password")}</span>
                  <small>{copyText("new_password_hint", "Use at least 8 characters with letters and numbers")}</small>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                    aria-label={copyText("toggle_new_password", "Toggle new password visibility")}
                  >
                    {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </label>

                <label className="settings-field settings-field--full">
                  <span>{copyText("confirm_password_label", "Confirm New Password")}</span>
                  <small>{copyText("confirm_password_hint", "Prevents accidental typos before saving")}</small>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </div>

              <div className="settings-password-meter" data-score={passwordScore}>
                <span />
                <span />
                <span />
              </div>

              <div className="settings-checklist">
                <span className={passwordChecks.length ? "is-done" : ""}>
                  <CheckCircle2 size={15} />
                  {copyText("password_check_length", "8+ characters")}
                </span>
                <span className={passwordChecks.mixed ? "is-done" : ""}>
                  <CheckCircle2 size={15} />
                  {copyText("password_check_mixed", "Letter and number")}
                </span>
                <span className={passwordChecks.strongLength ? "is-done" : ""}>
                  <CheckCircle2 size={15} />
                  {copyText("password_check_strong", "12+ characters recommended")}
                </span>
              </div>

              <div className="settings-actions">
                <button
                  type="submit"
                  className="settings-btn settings-btn--dark"
                  disabled={passwordSaving || !passwordReady}
                >
                  {passwordSaving ? <Loader2 size={16} className="settings-spin" /> : <KeyRound size={16} />}
                  {passwordSaving ? copyText("pw_status_saving", "Saving...") : copyText("update_pw_button", "Update Password")}
                </button>
                <StatusMessage type="success">{passwordSuccess}</StatusMessage>
                <StatusMessage type="error">
                  {passwordMismatch
                    ? copyText("password_mismatch", "New passwords do not match")
                    : passwordError}
                </StatusMessage>
              </div>
            </form>
          </SettingsCard>

          <SettingsCard
            id="notifications"
            eyebrow={copyText("notifications_eyebrow", "Communication")}
            title={copyText("notifications_title", "Notification Preferences")}
            description={copyText("notifications_description", "Choose which account and session updates should reach you")}
            icon={Bell}
          >
            <div className="settings-toggle-stack">
              <ToggleRow
                icon={Mail}
                label={copyText("notify_email_reminders", "Email session reminders")}
                description={copyText("notify_email_reminders_hint", "Get reminders before upcoming sessions")}
                checked={notifications.emailSessionReminders}
                onChange={(value) => updateNotificationPreference("emailSessionReminders", value)}
              />
              <ToggleRow
                icon={CalendarDays}
                label={copyText("notify_email_changes", "Schedule changes")}
                description={copyText("notify_email_changes_hint", "Email me when sessions are booked, moved, or canceled")}
                checked={notifications.emailSessionChanges}
                onChange={(value) => updateNotificationPreference("emailSessionChanges", value)}
              />
              <ToggleRow
                icon={Smartphone}
                label={copyText("notify_in_app", "In-app reminders")}
                description={copyText("notify_in_app_hint", "Show session reminders inside Speexify")}
                checked={notifications.inAppSessionReminders}
                onChange={(value) => updateNotificationPreference("inAppSessionReminders", value)}
              />
              <ToggleRow
                icon={PackageCheck}
                label={copyText("notify_weekly_digest", "Weekly progress digest")}
                description={copyText("notify_weekly_digest_hint", "Send a compact learning progress recap")}
                checked={notifications.weeklyProgressDigest}
                onChange={(value) => updateNotificationPreference("weeklyProgressDigest", value)}
              />
            </div>

            <div className="settings-inline-panel">
              <label className="settings-field">
                <span>{copyText("reminder_timing_label", "Reminder timing")}</span>
                <small>{copyText("reminder_timing_hint", "Default lead time before each session")}</small>
                <select
                  value={notifications.reminderLeadTime}
                  onChange={(event) => updateNotificationPreference("reminderLeadTime", event.target.value)}
                >
                  <option value="24h">{copyText("reminder_24h", "24 hours before")}</option>
                  <option value="6h">{copyText("reminder_6h", "6 hours before")}</option>
                  <option value="1h">{copyText("reminder_1h", "1 hour before")}</option>
                  <option value="none">{copyText("reminder_none", "Do not remind me")}</option>
                </select>
              </label>
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="settings-btn settings-btn--primary"
                disabled={notificationsSaving}
                onClick={() => saveNotificationPreferences()}
              >
                {notificationsSaving ? <Loader2 size={16} className="settings-spin" /> : <Save size={16} />}
                {notificationsSaving ? copyText("status_saving", "Saving...") : copyText("save_notifications", "Save Preferences")}
              </button>
              <StatusMessage type="success">{notificationsSuccess}</StatusMessage>
              <StatusMessage type="error">{notificationsError}</StatusMessage>
            </div>
          </SettingsCard>

          <SettingsCard
            id="calendar"
            eyebrow={copyText("calendar_eyebrow", "External calendars")}
            title={copyText("calendar_title", "Calendar Sync")}
            description={copyText("calendar_description", "Subscribe to your Speexify sessions in Google, Apple, or Outlook")}
            icon={Globe2}
          >
            <div className="settings-callout">
              <CalendarDays size={19} />
              <div>
                <strong>{copyText("calendar_sensitive_title", "Treat this link like a password")}</strong>
                <p>{copyText("calendar_sensitive_copy", "Anyone with the feed link can see your session calendar until the link expires or is revoked.")}</p>
              </div>
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="settings-btn settings-btn--primary"
                onClick={loadCalendarExportLink}
                disabled={calendarBusy}
              >
                {calendarBusy ? <Loader2 size={16} className="settings-spin" /> : <RefreshCw size={16} />}
                {calendarUrls
                  ? copyText("calendar_refresh", "Refresh Link")
                  : copyText("calendar_generate", "Generate Export Link")}
              </button>
              <button
                type="button"
                className="settings-btn settings-btn--ghost settings-btn--danger"
                onClick={revokeCalendarExportLink}
                disabled={calendarBusy}
              >
                <Trash2 size={16} />
                {copyText("calendar_revoke", "Revoke Links")}
              </button>
            </div>

            {calendarUrls ? (
              <div className="settings-calendar-links">
                {[
                  ["webcal", "webcalUrl", copyText("calendar_webcal", "webcal subscription link")],
                  ["ics", "httpsUrl", copyText("calendar_ics", "ICS direct link")],
                ].map(([key, field, label]) => (
                  <div className="settings-copy-field" key={key}>
                    <label>
                      <span>{label}</span>
                      <small>
                        {key === "webcal"
                          ? copyText("calendar_webcal_hint", "Best for calendar subscriptions")
                          : copyText("calendar_ics_hint", "Use when an app asks for an ICS URL")}
                      </small>
                    </label>
                    <div>
                      <input value={calendarUrls[field] || ""} readOnly onFocus={(event) => event.target.select()} />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(calendarUrls[field], key)}
                      >
                        {copiedCalendarField === key ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        {copiedCalendarField === key
                          ? copyText("copied", "Copied")
                          : copyText("copy", "Copy")}
                      </button>
                    </div>
                  </div>
                ))}
                <p className="settings-muted">
                  {copyText("calendar_expires", "Expires")}{" "}
                  {formatDate(calendarUrls.expiresAt, locale)}
                </p>
              </div>
            ) : null}

            <StatusMessage type="success">{calendarSuccess}</StatusMessage>
            <StatusMessage type="error">{calendarError}</StatusMessage>
          </SettingsCard>

          <SettingsCard
            id="privacy"
            eyebrow={copyText("privacy_eyebrow", "Control")}
            title={copyText("privacy_title", "Privacy & Data")}
            description={copyText("privacy_description", "Export your data or request account deletion from one place")}
            icon={Database}
          >
            <div className="settings-action-grid">
              <button
                type="button"
                className="settings-action-card"
                onClick={exportData}
                disabled={privacyBusy === "export"}
              >
                {privacyBusy === "export" ? <Loader2 className="settings-spin" /> : <Download />}
                <span>
                  <strong>{copyText("privacy_export_title", "Export my data")}</strong>
                  <small>{copyText("privacy_export_hint", "Download account, sessions, package, and privacy data")}</small>
                </span>
              </button>
              <button
                type="button"
                className="settings-action-card settings-action-card--danger"
                onClick={requestDeletion}
                disabled={privacyBusy === "delete"}
              >
                {privacyBusy === "delete" ? <Loader2 className="settings-spin" /> : <Trash2 />}
                <span>
                  <strong>{copyText("privacy_delete_title", "Request account deletion")}</strong>
                  <small>{copyText("privacy_delete_hint", "Ask the team to review and process deletion safely")}</small>
                </span>
              </button>
            </div>

            <div className="settings-request-list">
              <div className="settings-request-list__head">
                <strong>{copyText("privacy_requests_title", "Recent privacy requests")}</strong>
              </div>
              {privacyRequests.length ? (
                privacyRequests.slice(0, 4).map((request) => (
                  <div className="settings-request-row" key={request.id}>
                    <span>{request.type}</span>
                    <strong>{request.status}</strong>
                    <small>{formatDate(request.createdAt, locale)}</small>
                  </div>
                ))
              ) : (
                <p className="settings-muted">{copyText("privacy_no_requests", "No privacy requests yet.")}</p>
              )}
            </div>

            <StatusMessage type="success">{privacySuccess}</StatusMessage>
            <StatusMessage type="error">{privacyError}</StatusMessage>
          </SettingsCard>

          <SettingsCard
            id="plan"
            eyebrow={copyText("plan_eyebrow", "Learning account")}
            title={copyText("plan_title", "Plan & Credits")}
            description={copyText("plan_description", "See the active learning packages attached to this account")}
            icon={CreditCard}
          >
            <div className="settings-plan-grid">
              <div>
                <span>{copyText("plan_active_packages", "Active packages")}</span>
                <strong>{activePackages.length}</strong>
              </div>
              <div>
                <span>{copyText("plan_total_sessions", "Total sessions")}</span>
                <strong>{packageTotals.total}</strong>
              </div>
              <div>
                <span>{copyText("plan_used_sessions", "Used sessions")}</span>
                <strong>{packageTotals.used}</strong>
              </div>
              <div>
                <span>{copyText("plan_remaining_sessions", "Remaining")}</span>
                <strong>{packageTotals.remaining}</strong>
              </div>
            </div>

            <div className="settings-package-list">
              {packages.length ? (
                packages.slice(0, 5).map((item) => (
                  <div className="settings-package-row" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <small>
                        {item.sessionsUsed || 0}/{item.sessionsTotal || 0}{" "}
                        {copyText("plan_sessions_used", "sessions used")}
                      </small>
                    </div>
                    <span className={item.expired ? "is-muted" : ""}>
                      {item.expired ? copyText("plan_expired", "Expired") : item.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="settings-muted">{copyText("plan_empty", "No learning package is attached to this account yet.")}</p>
              )}
            </div>
          </SettingsCard>

          <SettingsCard
            id="devices"
            eyebrow={copyText("devices_eyebrow", "Sessions")}
            title={copyText("devices_title", "Devices & Sessions")}
            description={copyText("devices_description", "Understand where this account is currently being used")}
            icon={Monitor}
          >
            <div className="settings-device-row">
              <div className="settings-device-row__icon">
                <Monitor size={20} />
              </div>
              <div>
                <strong>{copyText("current_device_title", "Current browser session")}</strong>
                <small>{copyText("current_device_hint", "This is the active session you are using right now.")}</small>
              </div>
              <span>{copyText("device_active", "Active")}</span>
            </div>
            <div className="settings-callout settings-callout--quiet">
              <ShieldCheck size={18} />
              <p>{copyText("devices_future", "Full device history and “log out of other devices” should be backed by the session store next.")}</p>
            </div>
          </SettingsCard>
        </div>
      </div>
    </main>
  );
}
