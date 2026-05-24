"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Camera,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  Languages,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  Mail,
  PackageCheck,
  Settings,
  ShieldCheck,
  TrendingUp,
  Trash2,
  UserRound,
  Video,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import api from "@/lib/api";
import "@/styles/profile.scss";

const COPY = {
  en: {
    loading: "Loading your profile...",
    notAuthed: "Please sign in to view your profile.",
    titleFallback: "Your Speexify Profile",
    eyebrow: "Personal command center",
    subtitle:
      "A focused account hub for your sessions, credits, preferences, and next move.",
    profile: "Profile",
    learner: "Learner",
    teacher: "Teacher",
    admin: "Admin",
    memberSince: "Member since",
    timezone: "Timezone",
    language: "Language",
    notSet: "Not set",
    nextAction: "Next action",
    liveNow: "Live now",
    readyToJoin: "Your session is open. Join the room and continue from context.",
    joinSession: "Join session",
    prepare: "Prepare",
    upcomingSession: "Upcoming session",
    upcomingBody: "You have a session scheduled. Review the details before it starts.",
    openDetails: "Open details",
    noSession: "No session scheduled",
    noSessionBody:
      "Nothing is waiting right now. Use Calendar, Progress, or Settings to keep the account ready.",
    openCalendar: "Open calendar",
    credits: "Credits",
    creditsHint: "Remaining session credits",
    activePackages: "Active packages",
    upcoming: "Upcoming",
    completed: "Completed",
    readiness: "Profile readiness",
    readinessBody:
      "These are the account basics that make scheduling, reminders, and session prep feel smooth.",
    complete: "Complete",
    needsWork: "Needs setup",
    identity: "Identity",
    schedule: "Schedule",
    plan: "Plan",
    security: "Security",
    accountDetails: "Account details",
    manageSettings: "Manage settings",
    email: "Email",
    role: "Role",
    quickActions: "Quick actions",
    dashboard: "Dashboard",
    calendar: "Calendar",
    progress: "Progress",
    resources: "Resources",
    adminPanel: "Admin panel",
    support: "Support",
    packageTitle: "Learning package",
    noPackage: "No active package is attached yet.",
    expires: "Expires",
    used: "used",
    recentActivity: "Recent activity",
    recentEmpty: "No recent sessions yet.",
    viewCalendar: "View calendar",
    accountSecurity: "Account security",
    passwordUpdated: "Password has been updated.",
    reviewSecurity: "Review security settings.",
    addPhoto: "Add photo",
    changePhoto: "Change photo",
    removePhoto: "Remove photo",
    photoHint: "JPG, PNG, WEBP, or GIF. Max 3 MB.",
    photoError: "Failed to update profile photo.",
  },
  ar: {
    loading: "بيتحمّل ملفك...",
    notAuthed: "سجّل دخول عشان تشوف ملفك.",
    titleFallback: "ملفك في Speexify",
    eyebrow: "مركز الحساب الشخصي",
    subtitle:
      "مساحة مركزة لجلساتك وأرصدة حسابك وتفضيلاتك والخطوة الجاية.",
    profile: "الملف الشخصي",
    learner: "متدرب",
    teacher: "مدرّب",
    admin: "مسؤول",
    memberSince: "عضو منذ",
    timezone: "المنطقة الزمنية",
    language: "اللغة",
    notSet: "محددش",
    nextAction: "الخطوة الجاية",
    liveNow: "الجلسة دلوقتي",
    readyToJoin: "الجلسة مفتوحة. خش الغرفة وكمل من السياق.",
    joinSession: "خش الجلسة",
    prepare: "التحضير",
    upcomingSession: "جلسة جاية",
    upcomingBody: "عندك جلسة مجدولة. شوف التفاصيل قبل ما تبدأ.",
    openDetails: "افتح التفاصيل",
    noSession: "مفيش جلسة مجدولة",
    noSessionBody:
      "مفيش حاجة منتظراك دلوقتي. استخدم التقويم أو التقدم أو الإعدادات عشان تجهّز الحساب.",
    openCalendar: "افتح التقويم",
    credits: "الأرصدة",
    creditsHint: "أرصدة الجلسات المتبقية",
    activePackages: "الباقات النشطة",
    upcoming: "اللي جاي",
    completed: "اللي خلصت",
    readiness: "جاهزية الملف",
    readinessBody:
      "الأساسيات دي اللي بتخلي الجدولة والتذكيرات والتحضير أكثر سلاسة.",
    complete: "مكتمل",
    needsWork: "محتاج ضبط",
    identity: "الهوية",
    schedule: "الجدولة",
    plan: "الباقة",
    security: "الأمان",
    accountDetails: "تفاصيل الحساب",
    manageSettings: "نظّم الإعدادات",
    email: "الإيميل",
    role: "الدور",
    quickActions: "حاجات سريعة",
    dashboard: "لوحة التحكم",
    calendar: "التقويم",
    progress: "التقدم",
    resources: "المصادر",
    adminPanel: "الإدارة",
    support: "الدعم",
    packageTitle: "باقة التمرين",
    noPackage: "مفيش باقة نشطة مرتبطة بالحساب لسه.",
    expires: "بتخلص",
    used: "مستخدم",
    recentActivity: "النشاط الأخير",
    recentEmpty: "مفيش جلسات حديثة لسه.",
    viewCalendar: "شوف التقويم",
    accountSecurity: "أمان الحساب",
    passwordUpdated: "الباسورد اتحدّث.",
    reviewSecurity: "شوف إعدادات الأمان.",
    addPhoto: "ضيف صورة",
    changePhoto: "غيّر الصورة",
    removePhoto: "امسح الصورة",
    photoHint: "JPG أو PNG أو WEBP أو GIF. الحد الأقصى 3 ميجابايت.",
    photoError: "مقدرناش نحدّث صورة الملف.",
  },
};

function getInitials(user) {
  const source = user?.name || user?.email || "S";
  const parts = source
    .replace(/@.*$/, "")
    .split(/\s+|[._-]+/)
    .filter(Boolean);

  return (parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2))
    .toUpperCase()
    .replace(/[^A-Z0-9\u0600-\u06FF]/g, "");
}

function AvatarVisual({ user }) {
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" />;
  }
  return <span>{getInitials(user)}</span>;
}

function displayName(user) {
  return user?.name || user?.email?.split("@")?.[0] || "Speexify";
}

function roleLabel(role, copy) {
  if (role === "admin") return copy.admin;
  if (role === "teacher") return copy.teacher;
  return copy.learner;
}

function pickList(payload, key) {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.sessions)) return data.sessions;
  if (Array.isArray(data?.items)) return data.items;
  return [];
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

function formatDateTime(value, locale, timezone) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || undefined,
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function canJoin(startAt, endAt) {
  if (!startAt) return false;
  const now = Date.now();
  const start = new Date(startAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : start + 60 * 60 * 1000;
  return now >= start - 15 * 60 * 1000 && now <= end;
}

function packageTotals(packages) {
  return packages.reduce(
    (acc, item) => {
      acc.total += Number(item.sessionsTotal || 0);
      acc.used += Number(item.sessionsUsed || 0);
      acc.remaining += Number(
        item.remaining ?? Math.max(0, Number(item.sessionsTotal || 0) - Number(item.sessionsUsed || 0))
      );
      return acc;
    },
    { total: 0, used: 0, remaining: 0 }
  );
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <article className="profile-stat-card">
      <span className="profile-stat-card__icon">
        <Icon size={20} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    </article>
  );
}

function DetailRow({ label, value, icon: Icon }) {
  return (
    <div className="profile-detail-row">
      <span className="profile-detail-row__icon">
        <Icon size={18} />
      </span>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function QuickAction({ href, label, icon: Icon }) {
  return (
    <Link href={href} className="profile-quick-action">
      <span>
        <Icon size={18} />
      </span>
      <strong>{label}</strong>
      <ArrowRight size={16} />
    </Link>
  );
}

function SessionRow({ session, locale, timezone }) {
  return (
    <div className="profile-session-row">
      <span className="profile-session-row__dot" />
      <div>
        <strong>{session.title || "Speexify session"}</strong>
        <small>{formatDateTime(session.startAt, locale, timezone)}</small>
      </div>
      <em>{session.status || "scheduled"}</em>
    </div>
  );
}

export default function ProfileHub() {
  const { user, checking, refresh } = useAuth();
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const copy = COPY[locale] || COPY.en;

  const [profileData, setProfileData] = useState({
    me: null,
    summary: null,
    teacherSummary: null,
    packages: [],
    upcoming: [],
    past: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    const teacherRequest =
      user.role === "teacher"
        ? api.get("/teacher/summary", { params: { t: Date.now() } })
        : Promise.resolve({ data: null });

    try {
      const [meRes, summaryRes, packageRes, upcomingRes, pastRes, teacherRes] =
        await Promise.allSettled([
          api.get("/me", { params: { t: Date.now() } }),
          api.get("/me/summary", { params: { t: Date.now() } }),
          api.get("/me/packages", { params: { t: Date.now() } }),
          api.get("/me/sessions", {
            params: { range: "upcoming", limit: 4, t: Date.now() },
          }),
          api.get("/me/sessions", {
            params: { range: "past", limit: 4, t: Date.now() },
          }),
          teacherRequest,
        ]);

      if (meRes.status === "rejected") throw meRes.reason;

      setProfileData({
        me: meRes.value.data,
        summary: summaryRes.status === "fulfilled" ? summaryRes.value.data : null,
        teacherSummary:
          teacherRes.status === "fulfilled" ? teacherRes.value.data : null,
        packages: packageRes.status === "fulfilled" ? pickList(packageRes.value, "items") : [],
        upcoming: upcomingRes.status === "fulfilled" ? pickList(upcomingRes.value, "upcoming") : [],
        past: pastRes.status === "fulfilled" ? pickList(pastRes.value, "past") : [],
      });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to load profile");
      setProfileData((current) => ({ ...current, me: user }));
    } finally {
      setLoading(false);
    }
  }, [user]);

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarBusy(true);
    setAvatarError("");
    try {
      const body = new FormData();
      body.append("avatar", file);
      const res = await api.post("/me/avatar", body);
      setProfileData((current) => ({ ...current, me: res.data }));
      await refresh();
    } catch (err) {
      setAvatarError(err?.response?.data?.error || copy.photoError);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setAvatarError("");
    try {
      const res = await api.delete("/me/avatar");
      setProfileData((current) => ({ ...current, me: res.data }));
      await refresh();
    } catch (err) {
      setAvatarError(err?.response?.data?.error || copy.photoError);
    } finally {
      setAvatarBusy(false);
    }
  }

  useEffect(() => {
    if (checking) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadProfile();
  }, [checking, user, loadProfile]);

  const me = profileData.me || user;
  const activePackages = useMemo(
    () =>
      profileData.packages.filter(
        (item) => item.status === "active" && !item.expired
      ),
    [profileData.packages]
  );
  const totals = useMemo(() => packageTotals(activePackages), [activePackages]);
  const summaryNextSession =
    profileData.summary?.nextSession?.status === "canceled"
      ? null
      : profileData.summary?.nextSession;
  const nextSession =
    profileData.teacherSummary?.nextTeach ||
    summaryNextSession ||
    profileData.upcoming.find((item) => item.status !== "canceled") ||
    null;
  const timezone = me?.timezone || profileData.summary?.timezone || "";
  const completedCount =
    profileData.summary?.completedCount ??
    profileData.past.filter((item) => item.status === "completed").length;
  const upcomingCount =
    profileData.summary?.upcomingCount ?? profileData.upcoming.length;
  const readinessItems = [
    { label: copy.identity, complete: Boolean(me?.name), icon: UserRound },
    { label: copy.schedule, complete: Boolean(timezone), icon: CalendarDays },
    {
      label: copy.plan,
      complete: me?.role !== "learner" || activePackages.length > 0,
      icon: PackageCheck,
    },
    { label: copy.security, complete: Boolean(me?.passwordChangedAt), icon: ShieldCheck },
  ];
  const readinessScore = Math.round(
    (readinessItems.filter((item) => item.complete).length / readinessItems.length) * 100
  );
  const joinable = nextSession && canJoin(nextSession.startAt, nextSession.endAt);
  const primaryNextHref = joinable
    ? `/classroom/${nextSession.id}`
    : nextSession?.id
      ? `${prefix}/dashboard/sessions/${nextSession.id}`
      : `${prefix}/calendar`;
  const primaryNextLabel = joinable
    ? copy.joinSession
    : nextSession
      ? copy.openDetails
      : copy.openCalendar;

  const quickActions = [
    { href: `${prefix}/dashboard`, label: copy.dashboard, icon: LayoutDashboard },
    { href: `${prefix}/calendar`, label: copy.calendar, icon: CalendarDays },
    { href: `${prefix}/dashboard/progress`, label: copy.progress, icon: TrendingUp },
    ...(me?.role === "teacher" || me?.role === "admin"
      ? [{ href: `${prefix}/resources`, label: copy.resources, icon: BookOpen }]
      : []),
    ...(me?.role === "admin"
      ? [{ href: `${prefix}/admin`, label: copy.adminPanel, icon: ShieldCheck }]
      : []),
    { href: `${prefix}/settings`, label: copy.manageSettings, icon: Settings },
    { href: `${prefix}/contact`, label: copy.support, icon: LifeBuoy },
  ];

  if (checking || loading) {
    return (
      <main className="profile-page profile-page--center">
        <Loader2 className="profile-spin" size={24} />
        <p>{copy.loading}</p>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="profile-page profile-page--center">
        <CircleAlert size={24} />
        <p>{copy.notAuthed}</p>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div className="profile-hero__identity">
          <div className="profile-avatar-stack">
            <label className="profile-avatar-control">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                disabled={avatarBusy}
              />
              <span className="profile-avatar" aria-hidden="true">
                <AvatarVisual user={me} />
              </span>
              <span className="profile-avatar-action">
                {avatarBusy ? <Loader2 size={16} className="profile-spin" /> : <Camera size={16} />}
                {me.avatarUrl ? copy.changePhoto : copy.addPhoto}
              </span>
            </label>
            <small>{copy.photoHint}</small>
            {me.avatarUrl ? (
              <button
                type="button"
                className="profile-avatar-remove"
                onClick={removeAvatar}
                disabled={avatarBusy}
              >
                <Trash2 size={15} />
                {copy.removePhoto}
              </button>
            ) : null}
          </div>
          <div>
            <p className="profile-eyebrow">{copy.eyebrow}</p>
            <h1>{displayName(me) || copy.titleFallback}</h1>
            <p>{copy.subtitle}</p>
            <div className="profile-chips">
              <span>{roleLabel(me.role, copy)}</span>
              <span>{timezone || copy.notSet}</span>
              <span>{copy.memberSince} {formatDate(me.createdAt, locale)}</span>
            </div>
          </div>
        </div>

        <article className={`profile-next-card${joinable ? " profile-next-card--live" : ""}`}>
          <span className="profile-next-card__icon">
            {joinable ? <Video size={22} /> : <CalendarDays size={22} />}
          </span>
          <div>
            <p>{copy.nextAction}</p>
            <h2>{joinable ? copy.liveNow : nextSession ? copy.upcomingSession : copy.noSession}</h2>
            <span>
              {joinable
                ? copy.readyToJoin
                : nextSession
                  ? `${formatDateTime(nextSession.startAt, locale, timezone)}`
                  : copy.noSessionBody}
            </span>
          </div>
          <Link href={primaryNextHref} className="profile-primary-link">
            {primaryNextLabel}
            <ArrowRight size={17} />
          </Link>
        </article>
      </section>

      {avatarError ? (
        <div className="profile-alert">
          <CircleAlert size={18} />
          <span>{avatarError}</span>
        </div>
      ) : null}

      {error ? (
        <div className="profile-alert">
          <CircleAlert size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="profile-stats">
        <StatCard icon={CreditCard} label={copy.credits} value={totals.remaining} hint={copy.creditsHint} />
        <StatCard icon={PackageCheck} label={copy.activePackages} value={activePackages.length} />
        <StatCard icon={CalendarDays} label={copy.upcoming} value={upcomingCount} />
        <StatCard icon={CheckCircle2} label={copy.completed} value={completedCount} />
      </section>

      <section className="profile-grid">
        <article className="profile-panel profile-panel--readiness">
          <div className="profile-panel__header">
            <div>
              <p className="profile-eyebrow">{copy.profile}</p>
              <h2>{copy.readiness}</h2>
              <span>{copy.readinessBody}</span>
            </div>
            <strong>{readinessScore}%</strong>
          </div>
          <div className="profile-readiness-bar">
            <span style={{ width: `${readinessScore}%` }} />
          </div>
          <div className="profile-readiness-list">
            {readinessItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={item.complete ? "is-complete" : ""}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                  <strong>{item.complete ? copy.complete : copy.needsWork}</strong>
                </div>
              );
            })}
          </div>
        </article>

        <article className="profile-panel">
          <div className="profile-panel__header">
            <div>
              <p className="profile-eyebrow">{copy.accountDetails}</p>
              <h2>{displayName(me)}</h2>
            </div>
            <Link href={`${prefix}/settings`} className="profile-panel-link">
              {copy.manageSettings}
            </Link>
          </div>
          <div className="profile-detail-list">
            <DetailRow icon={Mail} label={copy.email} value={me.email} />
            <DetailRow icon={UserRound} label={copy.role} value={roleLabel(me.role, copy)} />
            <DetailRow icon={Clock3} label={copy.timezone} value={timezone || copy.notSet} />
            <DetailRow icon={Languages} label={copy.language} value={me.language || locale} />
          </div>
        </article>

        <article className="profile-panel profile-panel--actions">
          <div className="profile-panel__header">
            <div>
              <p className="profile-eyebrow">{copy.nextAction}</p>
              <h2>{copy.quickActions}</h2>
            </div>
          </div>
          <div className="profile-quick-grid">
            {quickActions.map((item) => (
              <QuickAction key={`${item.href}-${item.label}`} {...item} />
            ))}
          </div>
        </article>

        <article className="profile-panel">
          <div className="profile-panel__header">
            <div>
              <p className="profile-eyebrow">{copy.plan}</p>
              <h2>{copy.packageTitle}</h2>
            </div>
          </div>
          <div className="profile-package-list">
            {activePackages.length ? (
              activePackages.slice(0, 3).map((item) => (
                <div className="profile-package-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.sessionsUsed || 0}/{item.sessionsTotal || 0} {copy.used}
                    </small>
                  </div>
                  <span>
                    {item.expiresAt ? `${copy.expires} ${formatDate(item.expiresAt, locale)}` : item.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="profile-empty">{copy.noPackage}</p>
            )}
          </div>
        </article>

        <article className="profile-panel">
          <div className="profile-panel__header">
            <div>
              <p className="profile-eyebrow">{copy.completed}</p>
              <h2>{copy.recentActivity}</h2>
            </div>
            <Link href={`${prefix}/calendar`} className="profile-panel-link">
              {copy.viewCalendar}
            </Link>
          </div>
          <div className="profile-session-list">
            {profileData.past.length ? (
              profileData.past
                .slice(0, 4)
                .map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    locale={locale}
                    timezone={timezone}
                  />
                ))
            ) : (
              <p className="profile-empty">{copy.recentEmpty}</p>
            )}
          </div>
        </article>

        <article className="profile-panel profile-panel--security">
          <div className="profile-panel__header">
            <div>
              <p className="profile-eyebrow">{copy.security}</p>
              <h2>{copy.accountSecurity}</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <p>
            {me.passwordChangedAt ? copy.passwordUpdated : copy.reviewSecurity}
          </p>
          <Link href={`${prefix}/settings#security`} className="profile-primary-link profile-primary-link--light">
            {copy.manageSettings}
            <ArrowRight size={17} />
          </Link>
        </article>
      </section>
    </main>
  );
}
