"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Coins, RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import api from "@/lib/api";
import { getDictionary, t } from "@/app/i18n";
import { getIntlLocale } from "@/utils/locale";

function formatEGP(minor, locale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
}

function formatDate(value, locale, timeZone) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      month: "short", day: "numeric", year: "numeric", timeZone,
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      month: "short", day: "numeric", year: "numeric",
    }).format(new Date(value));
  }
}

function formatTrendMonth(month, locale) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return String(month || "");
  const date = new Date(`${month}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: "short", year: "numeric", timeZone: "UTC",
  }).format(date);
}

const PAGE_SIZE = 25;

export default function EarningsPage() {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";
  const copy = getDictionary(locale, "earnings");
  const { user, checking } = useAuth();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [notReady, setNotReady] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    setNotReady(false);
    try {
      const { data: payload } = await api.get("/teacher/earnings", {
        params: { status: filter, limit: PAGE_SIZE, offset: page * PAGE_SIZE, t: Date.now() },
      });
      setData(payload);
    } catch (error) {
      setNotReady(error?.response?.data?.code === "EARNINGS_NOT_READY");
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, [filter, page]);

  useEffect(() => {
    setPage(0);
  }, [filter]);

  useEffect(() => {
    if (!checking && user?.role === "teacher") load();
  }, [checking, user, load]);

  const summary = data?.summary || { pendingMinor: 0, paidMinor: 0, pendingCount: 0, paidCount: 0 };
  const monthlyTrend = Array.isArray(summary.monthlyTrend) ? summary.monthlyTrend : [];
  const trendMax = Math.max(1, ...monthlyTrend.map((item) => Number(item.totalMinor) || 0));
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;
  const statusLabel = useMemo(() => ({
    PENDING: t(copy, "pending"),
    PAID: t(copy, "paid"),
  }), [copy]);

  if (!checking && user && user.role !== "teacher") {
    return <div className="earnings-page"><div className="earnings-empty"><h2>{t(copy, "title")}</h2><p>{t(copy, "manualNote")}</p></div></div>;
  }

  return (
    <main className="earnings-page">
      <div className="earnings-page__header">
        <Link href={`${prefix}/dashboard`} className="earnings-back"><BackIcon size={16} /> {t(copy, "backDashboard")}</Link>
        <span className="earnings-page__eyebrow"><Coins size={15} /> {t(copy, "eyebrow")}</span>
        <h1>{t(copy, "title")}</h1>
        <p>{t(copy, "subtitle")}</p>
      </div>

      <section className="earnings-summary" aria-label={t(copy, "eyebrow")}>
        <article className="earnings-summary__hero">
          <span>{t(copy, "awaiting")}</span>
          <strong>{formatEGP(summary.pendingMinor, locale)}</strong>
          <small>{t(copy, "awaitingHint")}</small>
          <div className="earnings-summary__spark" aria-label={t(copy, "trendLabel")}>{monthlyTrend.map((item) => <i key={item.month} style={{ height: `${Math.max(8, Math.round(((Number(item.totalMinor) || 0) / trendMax) * 100))}%` }} title={`${formatTrendMonth(item.month, locale)}: ${formatEGP(item.totalMinor, locale)}`} />)}</div>
        </article>
        <article className="earnings-summary__stat"><CheckCircle2 size={20} /><span>{t(copy, "paidToDate")}</span><strong>{formatEGP(summary.paidMinor, locale)}</strong><small>{t(copy, "paidHint")}</small></article>
        <article className="earnings-summary__stat"><Clock3 size={20} /><span>{t(copy, "sessions")}</span><strong>{summary.pendingCount + summary.paidCount}</strong><small>{t(copy, "sessionCount", { count: summary.pendingCount + summary.paidCount })}</small></article>
      </section>

      <section className="earnings-activity">
        <div className="earnings-activity__head">
          <div><h2>{t(copy, "activity")}</h2><p>{t(copy, "activityHint")}</p></div>
          <div className="earnings-filters" role="tablist" aria-label={t(copy, "activity")}>
            {["", "PENDING", "PAID"].map((value) => <button key={value || "all"} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{t(copy, value === "PENDING" ? "pending" : value === "PAID" ? "paid" : "all")}</button>)}
          </div>
        </div>
        {busy ? <div className="earnings-loading"><RefreshCw size={18} className="earnings-spin" /> {t(copy, "loading")}</div> : failed ? <div className="earnings-empty"><p>{notReady ? t(copy, "notReady") : t(copy, "error")}</p><button type="button" className="btn btn--primary" onClick={load}>{t(copy, "retry")}</button></div> : entries.length === 0 ? <div className="earnings-empty"><div className="earnings-empty__icon"><Coins size={24} /></div><h3>{t(copy, "emptyTitle")}</h3><p>{t(copy, "emptyBody")}</p></div> : (
          <><div className="earnings-table-wrap"><table className="earnings-table"><thead><tr><th>{t(copy, "session")}</th><th>{t(copy, "date")}</th><th>{t(copy, "duration")}</th><th>{t(copy, "rate")}</th><th>{t(copy, "amount")}</th><th>{t(copy, "status")}</th></tr></thead><tbody>{entries.map((entry) => { const isAdjustment = entry.entryType === "ADJUSTMENT"; const missingRate = !isAdjustment && entry.status === "PENDING" && Number(entry.amountMinor) <= 0; const adjustmentStatus = entry.status === "PAID" ? statusLabel.PAID : t(copy, "adminAdjustment"); return <tr key={`${entry.entryType || "SESSION"}-${entry.id}`}><td><strong>{isAdjustment ? t(copy, "manualAdjustment") : entry.title}</strong>{isAdjustment && entry.reason ? <small className="earnings-row-note">{entry.reason}</small> : null}</td><td>{formatDate(entry.startAt || entry.createdAt, locale, user?.timezone)}</td><td>{isAdjustment ? "—" : `${entry.durationMinutes} min`}</td><td>{isAdjustment ? t(copy, "adminAdjustment") : entry.rateType === "hourly" ? t(copy, "hourly") : entry.rateType === "per_session" ? t(copy, "perSession") : t(copy, "notConfigured")}</td><td className="earnings-table__amount">{formatEGP(entry.amountMinor, locale)}</td><td><span className={`earnings-status earnings-status--${entry.status.toLowerCase()}${missingRate ? " adm-earnings-status--missing" : ""}`}>{missingRate ? t(copy, "notConfigured") : isAdjustment ? adjustmentStatus : statusLabel[entry.status] || entry.status}</span></td></tr>; })}</tbody></table></div>
          {Number(data?.total) > PAGE_SIZE ? <div className="earnings-pagination" aria-label={t(copy, "pagination")}><span>{t(copy, "pageOf", { from: page * PAGE_SIZE + 1, to: Math.min((page + 1) * PAGE_SIZE, Number(data.total)), total: Number(data.total) })}</span><div><button type="button" className="btn btn--secondary" disabled={page === 0 || busy} onClick={() => setPage((value) => Math.max(0, value - 1))}>{t(copy, "previous")}</button><button type="button" className="btn btn--secondary" disabled={(page + 1) * PAGE_SIZE >= Number(data.total) || busy} onClick={() => setPage((value) => value + 1)}>{t(copy, "next")}</button></div></div> : null}
          </>)}
      </section>
    </main>
  );
}
