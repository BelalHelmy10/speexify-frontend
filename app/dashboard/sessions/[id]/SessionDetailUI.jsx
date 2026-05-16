"use client";

import Link from "next/link";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Circle,
  ClipboardCheck,
  GraduationCap,
  Users,
  ChevronRight,
  Video,
  ExternalLink,
  Star,
  TrendingUp,
  BookOpen,
  FileText,
  AlertTriangle,
  X,
  UserRound,
  MessageSquare,
  Sparkles,
  CalendarPlus,
} from "lucide-react";

export function SessionIcon({ name, size = 20, ...rest }) {
  const props = { size, strokeWidth: 2, "aria-hidden": true, ...rest };
  const icons = {
    calendar: Calendar,
    clock: Clock,
    check: Check,
    checkCircle: CheckCircle2,
    circle: Circle,
    attendance: ClipboardCheck,
    teacher: GraduationCap,
    learners: Users,
    user: UserRound,
    video: Video,
    external: ExternalLink,
    star: Star,
    progress: TrendingUp,
    notes: BookOpen,
    file: FileText,
    alert: AlertTriangle,
    x: X,
    feedback: MessageSquare,
    sparkles: Sparkles,
    calendarPlus: CalendarPlus,
  };
  const Icon = icons[name] || Sparkles;
  return <Icon {...props} />;
}

export function InfoTile({ icon, label, children, className = "" }) {
  return (
    <article className={`sd-tile ${className}`.trim()}>
      <span className="sd-tile__icon" aria-hidden>
        <SessionIcon name={icon} size={18} />
      </span>
      <div className="sd-tile__content">
        <h3 className="sd-tile__label">{label}</h3>
        <div className="sd-tile__body">{children}</div>
      </div>
    </article>
  );
}

export function Panel({ id, icon, title, hint, children, variant = "default" }) {
  return (
    <section id={id} className={`sd-panel sd-panel--${variant}`.trim()}>
      <header className="sd-panel__head">
        <span className="sd-panel__icon" aria-hidden>
          <SessionIcon name={icon} size={18} />
        </span>
        <div className="sd-panel__titles">
          <h2 className="sd-panel__title">{title}</h2>
          {hint && <p className="sd-panel__hint">{hint}</p>}
        </div>
      </header>
      <div className="sd-panel__body">{children}</div>
    </section>
  );
}

export function AsideCard({
  title,
  description,
  children,
  variant = "default",
  highlight = false,
}) {
  return (
    <aside
      className={`sd-aside-card sd-aside-card--${variant}${highlight ? " is-highlight" : ""}`.trim()}
    >
      {(title || description) && (
        <header className="sd-aside-card__head">
          {title && <h3 className="sd-aside-card__title">{title}</h3>}
          {description && (
            <p className="sd-aside-card__desc">{description}</p>
          )}
        </header>
      )}
      <div className="sd-aside-card__body">{children}</div>
    </aside>
  );
}

export function PersonRow({ name, email, role }) {
  return (
    <div className="sd-person">
      <div className="sd-person__info">
        <span className="sd-person__name">{name || email}</span>
        {email && name && <span className="sd-person__email">{email}</span>}
        {role && <span className="sd-person__role">{role}</span>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }) {
  return (
    <div className="sd-empty">
      <span className="sd-empty__icon" aria-hidden>
        <SessionIcon name={icon} size={22} />
      </span>
      <p className="sd-empty__title">{title}</p>
      {body && <p className="sd-empty__body">{body}</p>}
      {action}
    </div>
  );
}

export function Breadcrumbs({ dashboardHref, current, dashboardLabel }) {
  return (
    <nav className="sd-breadcrumbs" aria-label="Breadcrumb">
      <Link href={dashboardHref}>{dashboardLabel}</Link>
      <ChevronRight size={14} aria-hidden className="sd-breadcrumbs__chev" />
      <span aria-current="page">{current}</span>
    </nav>
  );
}

export function HeroChip({ icon, children }) {
  return (
    <span className="sd-hero-chip">
      <SessionIcon name={icon} size={14} />
      {children}
    </span>
  );
}
