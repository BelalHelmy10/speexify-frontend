"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Mail,
  Package,
  Phone,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import AdminAccessFallback from "@/app/admin/components/AdminAccessFallback";
import AdminDashboardHeader from "@/app/admin/components/AdminDashboardHeader";

function formatDate(value, locale = "en") {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatMoney(cents, currency = "EGP") {
  if (cents === null || cents === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: currency || "EGP",
      maximumFractionDigits: 2,
    }).format(Number(cents) / 100);
  } catch {
    return `${(Number(cents) / 100).toFixed(2)} ${currency || "EGP"}`;
  }
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map(displayValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function humanize(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatusPill({ value, positive = false }) {
  const normalized = String(value || "").toLowerCase();
  const isPositive = positive || ["active", "paid", "success", "completed", "submitted"].includes(normalized);
  const isNegative = ["failed", "declined", "canceled", "cancelled", "disabled"].includes(normalized);
  return (
    <span className={`adm-registration-status adm-registration-status--${isNegative ? "danger" : isPositive ? "success" : "neutral"}`}>
      {displayValue(value)}
    </span>
  );
}

function DetailField({ label, value, wide = false }) {
  return (
    <div className={`adm-registration-detail${wide ? " adm-registration-detail--wide" : ""}`}>
      <dt>{label}</dt>
      <dd>{displayValue(value)}</dd>
    </div>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title, count }) {
  return (
    <div className="adm-registration-section-heading">
      <div className="adm-registration-section-heading__icon">
        <Icon size={18} aria-hidden="true" />
      </div>
      <div>
        <p className="adm-registration-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {count !== undefined && <span className="adm-registration-section-heading__count">{count}</span>}
    </div>
  );
}

export default function AdminRegistrationDetailPage() {
  const { user: currentUser, checking } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const pathname = usePathname();
  const params = useParams();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const registrationId = params?.id;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin || !registrationId) return undefined;

    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .get(`/admin/registrations/${registrationId}`)
      .then(({ data }) => {
        if (!cancelled) setUser(data?.user || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.response?.data?.error || "We could not load this learner profile.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, registrationId]);

  const initials = useMemo(() => {
    const source = user?.name || user?.email || "?";
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [user]);

  if (checking || !isAdmin) {
    return <AdminAccessFallback checking={checking} isAdmin={isAdmin} />;
  }

  return (
    <div className="adm-admin-modern adm-registration-page">
      <AdminDashboardHeader />

      <main className="adm-registration-shell">
        <Link href={`${prefix}/admin`} className="adm-registration-back">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to admin dashboard
        </Link>

        {loading && (
          <div className="adm-registration-state adm-admin-card" role="status">
            Loading learner profile…
          </div>
        )}

        {!loading && error && (
          <div className="adm-registration-state adm-registration-state--error adm-admin-card" role="alert">
            <XCircle size={24} aria-hidden="true" />
            <div>
              <h1>Profile unavailable</h1>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && user && (
          <>
            <section className="adm-registration-hero adm-admin-card">
              <div className="adm-registration-hero__identity">
                <div className="adm-registration-avatar" aria-hidden="true">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}
                </div>
                <div>
                  <div className="adm-registration-badges">
                    <StatusPill value="New learner" positive />
                    <StatusPill value={user.isDisabled ? "Disabled" : "Active"} positive={!user.isDisabled} />
                  </div>
                  <h1>{user.name || "Unnamed learner"}</h1>
                  <p>{user.email}</p>
                  <span className="adm-registration-joined">Joined {formatDate(user.createdAt, locale)}</span>
                </div>
              </div>
              <div className="adm-registration-hero__actions">
                <a href={`mailto:${user.email}`} className="adm-btn-primary">
                  <Mail size={16} aria-hidden="true" />
                  Email learner
                </a>
                {user.phone && (
                  <a href={`tel:${user.phone}`} className="adm-btn-secondary">
                    <Phone size={16} aria-hidden="true" />
                    Call learner
                  </a>
                )}
              </div>
            </section>

            <section className="adm-registration-summary" aria-label="Learner activity summary">
              <div className="adm-registration-stat">
                <span>Orders</span>
                <strong>{user._count?.orders ?? 0}</strong>
                <CreditCard size={18} aria-hidden="true" />
              </div>
              <div className="adm-registration-stat">
                <span>Packages</span>
                <strong>{user._count?.userPackages ?? 0}</strong>
                <Package size={18} aria-hidden="true" />
              </div>
              <div className="adm-registration-stat">
                <span>Sessions</span>
                <strong>{user._count?.sessions ?? 0}</strong>
                <CheckCircle2 size={18} aria-hidden="true" />
              </div>
              <div className="adm-registration-stat">
                <span>Intake forms</span>
                <strong>{user._count?.onboardingForms ?? 0}</strong>
                <ClipboardList size={18} aria-hidden="true" />
              </div>
            </section>

            <section className="adm-registration-panel adm-admin-card">
              <SectionHeading icon={UserRound} eyebrow="Account profile" title="Contact and account details" />
              <dl className="adm-registration-detail-grid">
                <DetailField label="Full name" value={user.name} />
                <DetailField label="Email address" value={user.email} />
                <DetailField label="Phone number" value={user.phone} />
                <DetailField label="Role" value={user.role} />
                <DetailField label="Language" value={user.language} />
                <DetailField label="Timezone" value={user.timezone} />
                <DetailField label="User ID" value={user.id} />
                <DetailField label="Account created" value={formatDate(user.createdAt, locale)} />
                <DetailField label="Last profile update" value={formatDate(user.updatedAt, locale)} />
                <DetailField label="Password last changed" value={formatDate(user.passwordChangedAt, locale)} />
                <DetailField label="Marketing phone consent" value={user.marketingPhoneConsentAt ? "Granted" : "Not granted"} />
                <DetailField label="Consent source" value={user.marketingPhoneConsentSource} />
                <DetailField label="Consent version" value={user.marketingPhoneConsentVersion} />
                <DetailField label="Marketing opt-out" value={formatDate(user.marketingPhoneOptOutAt, locale)} />
              </dl>
            </section>

            <section className="adm-registration-panel adm-admin-card">
              <SectionHeading icon={CreditCard} eyebrow="Commerce" title="Orders and payment history" count={user.orders?.length || 0} />
              {user.orders?.length ? (
                <div className="adm-registration-table-wrap">
                  <table className="adm-registration-table">
                    <thead><tr><th>Order</th><th>Package</th><th>Amount</th><th>Status</th><th>Payment IDs</th><th>Created</th></tr></thead>
                    <tbody>
                      {user.orders.map((order) => (
                        <tr key={order.id}>
                          <td><strong>{order.id}</strong><span>{order.psp || "—"}</span></td>
                          <td>{order.package?.title || "—"}</td>
                          <td>{formatMoney(order.amountCents, order.currency)}</td>
                          <td><StatusPill value={order.status} /></td>
                          <td><span>{order.paymobTxnId ? `Txn ${order.paymobTxnId}` : "—"}</span><span>{order.pspOrderId ? `PSP ${order.pspOrderId}` : ""}</span></td>
                          <td>{formatDate(order.createdAt, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="adm-registration-empty">No orders have been recorded for this learner yet.</p>}
            </section>

            <section className="adm-registration-panel adm-admin-card">
              <SectionHeading icon={Package} eyebrow="Entitlements" title="Learner packages" count={user.userPackages?.length || 0} />
              {user.userPackages?.length ? (
                <div className="adm-registration-table-wrap">
                  <table className="adm-registration-table">
                    <thead><tr><th>Package</th><th>Progress</th><th>Status</th><th>Expires</th><th>Purchased</th></tr></thead>
                    <tbody>
                      {user.userPackages.map((pack) => (
                        <tr key={pack.id}>
                          <td><strong>{pack.title || pack.package?.title || "—"}</strong><span>{pack.minutesPerSession ? `${pack.minutesPerSession} min/session` : ""}</span></td>
                          <td>{pack.sessionsUsed} / {pack.sessionsTotal} sessions</td>
                          <td><StatusPill value={pack.status} /></td>
                          <td>{formatDate(pack.expiresAt, locale)}</td>
                          <td>{formatDate(pack.createdAt, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="adm-registration-empty">No package has been assigned yet.</p>}
            </section>

            <section className="adm-registration-panel adm-admin-card">
              <SectionHeading icon={ClipboardList} eyebrow="Learner context" title="Onboarding and intake" count={user.onboardingForms?.length || 0} />
              {user.onboardingForms?.length ? user.onboardingForms.map((form) => (
                <article className="adm-registration-record" key={form.id}>
                  <div className="adm-registration-record__top"><strong>Form #{form.id}</strong><span>{formatDate(form.createdAt, locale)}</span><StatusPill value={form.status} /></div>
                  <dl className="adm-registration-answer-grid">
                    {Object.entries(form.answers || {}).map(([key, value]) => <DetailField key={key} label={humanize(key)} value={displayValue(value)} wide />)}
                  </dl>
                </article>
              )) : <p className="adm-registration-empty">No onboarding form has been submitted yet.</p>}
            </section>

            <section className="adm-registration-panel adm-admin-card">
              <SectionHeading icon={ShieldCheck} eyebrow="Assessment" title="Placement submissions" count={user.assessmentSubmissions?.length || 0} />
              {user.assessmentSubmissions?.length ? user.assessmentSubmissions.map((assessment) => (
                <article className="adm-registration-record" key={assessment.id}>
                  <div className="adm-registration-record__top"><strong>Assessment #{assessment.id}</strong><span>{formatDate(assessment.createdAt, locale)}</span><StatusPill value={assessment.status} /></div>
                  <div className="adm-registration-assessment-meta"><span>Score: <strong>{displayValue(assessment.score)}</strong></span><span>CEFR: <strong>{displayValue(assessment.cefr)}</strong></span><span>Words: <strong>{displayValue(assessment.wordCount)}</strong></span></div>
                  <p className="adm-registration-text">{assessment.text || "No submission text."}</p>
                  {assessment.feedback && <p className="adm-registration-feedback"><strong>Feedback:</strong> {assessment.feedback}</p>}
                </article>
              )) : <p className="adm-registration-empty">No assessment submission has been recorded yet.</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
