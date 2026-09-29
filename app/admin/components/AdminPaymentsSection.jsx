"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import api from "@/lib/api";

const PAGE_SIZE = 25;

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysAgoInputValue(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dateInputValue(date);
}

function formatDate(value, options = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(date);
}

function formatMoney(cents, currency = "EGP") {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: currency || "EGP",
    maximumFractionDigits: 2,
  }).format(Number(cents || 0) / 100);
}

function shortId(value, length = 18) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length)}…` : text || "—";
}

const STATUS_META = {
  paid: { label: "Successful", icon: CheckCircle2, tone: "paid" },
  pending: { label: "Pending", icon: Clock3, tone: "pending" },
  failed: { label: "Declined", icon: XCircle, tone: "failed" },
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`adm-payments-status adm-payments-status--${meta.tone}`}>
      <Icon size={14} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function MetricCard({ label, value, detail, tone, icon: Icon, trend }) {
  return (
    <div className={`adm-payments-metric adm-payments-metric--${tone}`}>
      <div className="adm-payments-metric__topline">
        <span className="adm-payments-metric__label">{label}</span>
        <span className="adm-payments-metric__icon" aria-hidden="true">
          <Icon size={18} />
        </span>
      </div>
      <strong className="adm-payments-metric__value">{value}</strong>
      <span className="adm-payments-metric__detail">
        {trend ? (
          <span className="adm-payments-metric__trend">
            {trend > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend)}%
          </span>
        ) : null}
        {detail}
      </span>
    </div>
  );
}

function PaymentDetailDrawer({ payment, loading, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="adm-payments-drawer-layer" role="presentation">
      <button
        type="button"
        className="adm-payments-drawer-backdrop"
        onClick={onClose}
        aria-label="Close payment details"
      />
      <aside
        className="adm-payments-drawer"
        aria-labelledby="payment-detail-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="adm-payments-drawer__header">
          <div>
            <span className="adm-payments-eyebrow">Payment record</span>
            <h3 id="payment-detail-title">Transaction details</h3>
          </div>
          <button type="button" className="adm-payments-icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="adm-payments-drawer__loading" aria-live="polite">
            <RefreshCw className="adm-payments-spin" size={20} />
            Loading payment record…
          </div>
        ) : payment ? (
          <div className="adm-payments-drawer__body">
            <div className="adm-payments-detail-hero">
              <div>
                <StatusPill status={payment.status} />
                <strong>{formatMoney(payment.amountCents, payment.currency)}</strong>
                <span>{formatDate(payment.createdAt)}</span>
              </div>
              <span className="adm-payments-provider-badge">
                <ShieldCheck size={14} /> Paymob verified
              </span>
            </div>

            <section className="adm-payments-detail-block" aria-labelledby="payment-customer-heading">
              <h4 id="payment-customer-heading">Customer</h4>
              <div className="adm-payments-detail-grid">
                <div><span>Name</span><strong>{payment.customer?.name || "—"}</strong></div>
                <div><span>Email</span><strong>{payment.customer?.email || "—"}</strong></div>
                <div><span>Phone</span><strong>{payment.customer?.phone || "—"}</strong></div>
                <div><span>Package</span><strong>{payment.package?.title || "—"}</strong></div>
              </div>
            </section>

            <section className="adm-payments-detail-block" aria-labelledby="payment-identifiers-heading">
              <h4 id="payment-identifiers-heading">Provider identifiers</h4>
              <div className="adm-payments-detail-grid">
                <div><span>Order ID</span><strong className="adm-payments-mono">{payment.id}</strong></div>
                <div><span>Paymob transaction</span><strong className="adm-payments-mono">{payment.paymobTxnId || "Not assigned yet"}</strong></div>
                <div><span>Paymob order</span><strong className="adm-payments-mono">{payment.pspOrderId || "Not assigned yet"}</strong></div>
                <div><span>Discount</span><strong>{payment.discount ? `${payment.discount.code} (${payment.discount.percentage}% off)` : "None"}</strong></div>
              </div>
            </section>

            <section className="adm-payments-detail-block" aria-labelledby="payment-timeline-heading">
              <div className="adm-payments-detail-block__heading">
                <h4 id="payment-timeline-heading">Webhook timeline</h4>
                <span>{payment.webhookEvents?.length || 0} event{payment.webhookEvents?.length === 1 ? "" : "s"}</span>
              </div>
              {payment.webhookEvents?.length ? (
                <ol className="adm-payments-timeline">
                  {payment.webhookEvents.map((event) => (
                    <li key={event.id}>
                      <span className={`adm-payments-timeline__dot adm-payments-timeline__dot--${event.eventStatus}`} />
                      <div>
                        <strong>{event.resolution || event.eventStatus}</strong>
                        <span>{formatDate(event.receivedAt)} · attempt {event.attemptCount}</span>
                        {event.transactionId ? <span className="adm-payments-mono">Txn {event.transactionId}</span> : null}
                        {event.lastError ? <em>{event.lastError}</em> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="adm-payments-empty-detail">
                  <Clock3 size={18} />
                  No Paymob webhook has been received for this order yet.
                </div>
              )}
            </section>

            <section className="adm-payments-detail-block" aria-labelledby="payment-fulfillment-heading">
              <h4 id="payment-fulfillment-heading">Fulfillment</h4>
              {payment.fulfillment ? (
                <div className="adm-payments-fulfillment">
                  <CheckCircle2 size={17} />
                  <div><strong>{payment.fulfillment.title}</strong><span>{payment.fulfillment.sessionsTotal} sessions · {payment.fulfillment.status}</span></div>
                </div>
              ) : (
                <div className="adm-payments-empty-detail">Package credits have not been granted.</div>
              )}
            </section>
          </div>
        ) : (
          <div className="adm-payments-drawer__loading">Payment record unavailable.</div>
        )}
      </aside>
    </div>
  );
}

export default function AdminPaymentsSection() {
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    from: daysAgoInputValue(30),
    to: dateInputValue(new Date()),
  });
  const [searchDraft, setSearchDraft] = useState("");
  const [paymentData, setPaymentData] = useState({
    items: [],
    summary: { totalOrders: 0, paidOrders: 0, pendingOrders: 0, failedOrders: 0 },
    pagination: { total: 0, offset: 0, limit: PAGE_SIZE, hasMore: false },
  });
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchDraft }));
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchDraft]);

  const loadPayments = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {
        status: filters.status,
        q: filters.search || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        limit: PAGE_SIZE,
        offset,
      };
      const { data } = await api.get("/admin/payments", { params });
      setPaymentData(data);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to load payment operations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    loadPayments();
    const intervalId = window.setInterval(() => loadPayments(true), 30000);
    return () => window.clearInterval(intervalId);
  }, [loadPayments]);

  useEffect(() => {
    if (!selectedOrderId) return undefined;
    let active = true;
    setDetailLoading(true);
    api.get(`/admin/payments/${encodeURIComponent(selectedOrderId)}`)
      .then(({ data }) => {
        if (active) setSelectedPayment(data);
      })
      .catch(() => {
        if (active) setSelectedPayment(null);
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => { active = false; };
  }, [selectedOrderId]);

  const summary = paymentData.summary || {};
  const webhookStatuses = summary.webhook?.statuses || {};
  const webhookFailureCount = webhookStatuses.failed || 0;
  const total = paymentData.pagination?.total || 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const dateLabel = useMemo(() => {
    if (!filters.from && !filters.to) return "All time";
    if (filters.from && filters.to) return `${filters.from} → ${filters.to}`;
    return filters.from ? `From ${filters.from}` : `Until ${filters.to}`;
  }, [filters.from, filters.to]);

  function setStatus(status) {
    setFilters((current) => ({ ...current, status }));
    setOffset(0);
  }

  function setDateRange(preset) {
    if (preset === "all") {
      setFilters((current) => ({ ...current, from: "", to: "" }));
    } else if (preset === "7") {
      setFilters((current) => ({ ...current, from: daysAgoInputValue(7), to: dateInputValue(new Date()) }));
    } else if (preset === "30") {
      setFilters((current) => ({ ...current, from: daysAgoInputValue(30), to: dateInputValue(new Date()) }));
    } else if (preset === "90") {
      setFilters((current) => ({ ...current, from: daysAgoInputValue(90), to: dateInputValue(new Date()) }));
    }
    setOffset(0);
  }

  function exportCurrentPage() {
    const rows = paymentData.items || [];
    const header = ["Order ID", "Status", "Customer", "Email", "Package", "Amount", "Currency", "Created"];
    const body = rows.map((payment) => [
      payment.id,
      payment.status,
      payment.customer?.name || "",
      payment.customer?.email || "",
      payment.package?.title || "",
      (Number(payment.amountCents || 0) / 100).toFixed(2),
      payment.currency || "EGP",
      payment.createdAt || "",
    ]);
    const csv = [header, ...body]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `speexify-payments-${dateInputValue(new Date())}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="adm-admin-card adm-payments-section" id="admin-payments" aria-labelledby="admin-payments-title">
      <div className="adm-admin-card__header adm-payments-section__header">
        <div className="adm-admin-card__title-group">
          <div className="adm-admin-card__icon adm-admin-card__icon--primary" aria-hidden="true">
            <CreditCard size={25} />
          </div>
          <div>
            <span className="adm-payments-eyebrow">Revenue operations</span>
            <h2 className="adm-admin-card__title" id="admin-payments-title">Payments</h2>
            <p className="adm-admin-card__subtitle">Track every Paymob checkout from intent to fulfillment.</p>
          </div>
        </div>
        <div className="adm-admin-card__actions">
          <button type="button" className="adm-btn-secondary" onClick={exportCurrentPage} disabled={!paymentData.items?.length}>
            <Download size={16} /> Export page
          </button>
          <button type="button" className="adm-btn-primary" onClick={() => loadPayments(true)} disabled={loading || refreshing}>
            <RefreshCw size={16} className={refreshing ? "adm-payments-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="adm-payments-context-row">
        <span><Activity size={15} /> Live reconciliation view</span>
        <span>Auto-refreshes every 30 seconds</span>
        <span>{dateLabel}</span>
      </div>

      <div className="adm-payments-metrics" aria-label="Payment summary">
        <MetricCard label="Collected" value={formatMoney(summary.paidAmountCents)} detail={`${summary.paidOrders || 0} successful payments`} tone="paid" icon={CheckCircle2} />
        <MetricCard label="Awaiting result" value={formatMoney(summary.pendingAmountCents)} detail={`${summary.pendingOrders || 0} orders still open`} tone="pending" icon={Clock3} />
        <MetricCard label="Declined" value={formatMoney(summary.failedAmountCents)} detail={`${summary.failedOrders || 0} unsuccessful attempts`} tone="failed" icon={XCircle} />
        <MetricCard label="Checkout success" value={`${summary.conversionRate || 0}%`} detail={`${summary.totalOrders || 0} orders in view`} tone="coral" icon={Activity} />
      </div>

      <div className="adm-payments-health-row">
        <div className={`adm-payments-health ${webhookFailureCount ? "is-warning" : "is-healthy"}`}>
          <span className="adm-payments-health__dot" />
          <div><strong>{webhookFailureCount ? `${webhookFailureCount} webhook issue${webhookFailureCount === 1 ? "" : "s"}` : "Paymob webhooks healthy"}</strong><span>{webhookStatuses.processed || 0} events processed · {webhookStatuses.processing || 0} processing · {webhookStatuses.ignored || 0} ignored</span></div>
        </div>
        {summary.webhook?.lastReceivedAt ? <span className="adm-payments-health__last">Last event {formatDate(summary.webhook.lastReceivedAt)}</span> : null}
      </div>

      <div className="adm-payments-filters" role="search" aria-label="Filter payments">
        <label className="adm-payments-search">
          <Search size={17} aria-hidden="true" />
          <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search order, customer, email, or transaction…" />
        </label>
        <div className="adm-payments-status-tabs" role="tablist" aria-label="Payment status">
          {["all", "paid", "pending", "failed"].map((status) => (
            <button key={status} type="button" role="tab" aria-selected={filters.status === status} className={filters.status === status ? "is-active" : ""} onClick={() => setStatus(status)}>
              {status === "all" ? "All" : STATUS_META[status].label}
            </button>
          ))}
        </div>
        <select className="adm-payments-select" aria-label="Date range" defaultValue="30" onChange={(event) => setDateRange(event.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All time</option>
        </select>
        <div className="adm-payments-date-inputs">
          <input type="date" aria-label="From date" value={filters.from} onChange={(event) => { setFilters((current) => ({ ...current, from: event.target.value })); setOffset(0); }} />
          <span>to</span>
          <input type="date" aria-label="To date" value={filters.to} onChange={(event) => { setFilters((current) => ({ ...current, to: event.target.value })); setOffset(0); }} />
        </div>
      </div>

      {error ? <div className="adm-payments-error" role="alert">{error}<button type="button" onClick={() => loadPayments()}>Try again</button></div> : null}

      <div className="adm-payments-table-wrap">
        {loading && !paymentData.items?.length ? (
          <div className="adm-payments-loading"><RefreshCw className="adm-payments-spin" size={20} /> Loading payment activity…</div>
        ) : paymentData.items?.length ? (
          <table className="adm-payments-table">
            <thead><tr><th scope="col">Payment</th><th scope="col">Customer</th><th scope="col">Package</th><th scope="col">Status</th><th scope="col">Amount</th><th scope="col">Last activity</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {paymentData.items.map((payment) => (
                <tr key={payment.id}>
                  <td><strong className="adm-payments-mono">{shortId(payment.id)}</strong><span>{payment.paymobTxnId ? `Txn ${payment.paymobTxnId}` : "Awaiting provider transaction"}</span></td>
                  <td><strong>{payment.customer?.name || "Unknown customer"}</strong><span>{payment.customer?.email || payment.customer?.phone || "No contact details"}</span></td>
                  <td><strong>{payment.package?.title || "Package unavailable"}</strong><span>{formatDate(payment.createdAt)}</span></td>
                  <td><StatusPill status={payment.status} />{payment.latestWebhook?.lastError ? <span className="adm-payments-row-warning" title={payment.latestWebhook.lastError}>Webhook needs attention</span> : null}</td>
                  <td><strong>{formatMoney(payment.amountCents, payment.currency)}</strong><span>{payment.currency || "EGP"}</span></td>
                  <td><strong>{formatDate(payment.updatedAt)}</strong><span>{payment.latestWebhook ? `${payment.latestWebhook.eventStatus} webhook` : "No webhook received"}</span></td>
                  <td><button type="button" className="adm-payments-open-button" onClick={() => { setSelectedOrderId(payment.id); setSelectedPayment(null); }} aria-label={`Open payment ${payment.id}`}><ChevronRight size={18} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="adm-payments-empty"><CreditCard size={25} /><strong>No payments match this view</strong><span>Try a wider date range or clear the status/search filters.</span></div>
        )}
      </div>

      <div className="adm-payments-pagination">
        <span>{total ? `Showing ${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}` : "No payments"}</span>
        <div><button type="button" className="adm-btn-secondary adm-btn-secondary--compact" onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))} disabled={offset === 0 || loading}><ChevronLeft size={15} /> Previous</button><span>Page {currentPage} of {pageCount}</span><button type="button" className="adm-btn-secondary adm-btn-secondary--compact" onClick={() => setOffset((current) => current + PAGE_SIZE)} disabled={!paymentData.pagination?.hasMore || loading}>Next <ChevronRight size={15} /></button></div>
      </div>

      {selectedOrderId ? <PaymentDetailDrawer payment={selectedPayment} loading={detailLoading} onClose={() => { setSelectedOrderId(null); setSelectedPayment(null); }} /> : null}
    </section>
  );
}
