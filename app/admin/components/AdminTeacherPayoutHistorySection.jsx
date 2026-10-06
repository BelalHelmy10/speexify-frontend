"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";

const PAGE_SIZE = 25;

function formatEGP(minor) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminTeacherPayoutHistorySection({ teacherId, from, to }) {
  const { toast } = useToast();
  const [data, setData] = useState({ items: [], total: 0, reconciliation: {} });
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [correction, setCorrection] = useState(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/teacher-payouts", {
        params: {
          teacherId: teacherId || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          t: Date.now(),
        },
      });
      setData({
        items: Array.isArray(response.data?.items) ? response.data.items : [],
        total: Number(response.data?.total) || 0,
        reconciliation: response.data?.reconciliation || {},
      });
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to load payout history.");
    } finally {
      setLoading(false);
    }
  }, [from, page, status, teacherId, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [status, teacherId]);

  const summary = useMemo(
    () => Object.entries(data.reconciliation).map(([key, value]) => ({ key, ...value })),
    [data.reconciliation]
  );

  async function exportCsv() {
    try {
      const response = await api.get("/admin/teacher-payouts", {
        params: {
          teacherId: teacherId || undefined,
          status: status || undefined,
          from: from || undefined,
          to: to || undefined,
          format: "csv",
        },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "speexify-payout-history.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      toast.error(requestError.response?.data?.error || "Unable to export payout history.");
    }
  }

  async function submitCorrection(event) {
    event.preventDefault();
    const reason = correctionReason.trim();
    if (!correction || reason.length < 3) return;
    setBusy(true);
    try {
      await api.post("/admin/teacher-payouts/reversal", {
        payoutId: correction.id,
        action: correction.action,
        reason,
      });
      toast.success(correction.action === "VOID" ? "Payout voided and entries reopened." : "Payout reversed with a signed debit adjustment.");
      setCorrection(null);
      setCorrectionReason("");
      await load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.error || "Unable to correct this payout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="adm-admin-card" aria-labelledby="teacher-payout-history-title">
      <div className="adm-admin-card__header">
        <div>
          <h2 className="adm-admin-card__title" id="teacher-payout-history-title">Payout history & reconciliation</h2>
          <p className="adm-admin-card__subtitle">Every settlement has an amount, reference, status, and correction trail.</p>
        </div>
        <div className="adm-admin-card__actions">
          <label className="sr-only" htmlFor="payout-status-filter">Filter payout status</label>
          <select id="payout-status-filter" className="adm-filter-select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="PAID">Paid</option>
            <option value="VOIDED">Voided</option>
            <option value="REVERSED">Reversed</option>
          </select>
          <button type="button" className="adm-btn" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div className="adm-notification-delivery-summary" aria-label="Payout reconciliation totals">
        {summary.map((item) => (
          <div className="adm-notification-delivery-metric" key={item.key}>
            <span>{item.key}</span>
            <strong>{formatEGP(item.totalMinor)} · {item.count}</strong>
          </div>
        ))}
      </div>

      {error ? <div className="adm-notification-delivery-error" role="alert">{error}</div> : null}
      {loading ? <p className="adm-empty-state">Loading payout history…</p> : data.items.length === 0 ? <p className="adm-empty-state">No payouts match the selected filters.</p> : (
        <div className="adm-earnings-table-wrap">
          <table className="adm-earnings-table">
            <thead><tr><th scope="col">Teacher</th><th scope="col">Amount</th><th scope="col">Method</th><th scope="col">Status</th><th scope="col">Paid at</th><th scope="col">Reference</th><th scope="col">Recorded by</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.teacher?.name || item.teacher?.email || `Teacher #${item.teacherId}`}</strong>{item.reversal ? <small className="adm-earnings-row-note">{item.reversal.action}: {item.reversal.reason}</small> : null}</td>
                  <td>{formatEGP(item.totalMinor)}</td>
                  <td>{item.paymentMethod}</td>
                  <td><span className={`adm-earnings-status adm-earnings-status--${String(item.status).toLowerCase()}`}>{item.status}</span></td>
                  <td>{formatDate(item.paidAt)}</td>
                  <td>{item.paymentReference || "—"}</td>
                  <td>{item.createdBy?.name || item.createdBy?.email || "—"}</td>
                  <td>{item.status === "PAID" ? <div className="adm-earnings-panel__actions"><button type="button" className="adm-btn" onClick={() => setCorrection({ id: item.id, action: "VOID", totalMinor: item.totalMinor })}>Void</button><button type="button" className="adm-btn" onClick={() => setCorrection({ id: item.id, action: "REVERSE", totalMinor: item.totalMinor })}>Reverse</button></div> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.total > PAGE_SIZE ? <div className="adm-earnings-panel__toolbar" aria-label="Payout history pagination"><span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} of {data.total}</span><div className="adm-earnings-panel__actions"><button type="button" className="adm-btn" disabled={page === 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button><button type="button" className="adm-btn" disabled={(page + 1) * PAGE_SIZE >= data.total || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div></div> : null}

      {correction ? (
        <div className="adm-earnings-modal-backdrop" role="presentation">
          <form className="adm-earnings-modal" onSubmit={submitCorrection}>
            <div className="adm-earnings-modal__head"><div><span className="adm-earnings-panel__eyebrow">Irreversible accounting action</span><h3>{correction.action === "VOID" ? "Void payout" : "Reverse payout"}</h3></div><button type="button" className="adm-earnings-modal__close" onClick={() => setCorrection(null)} aria-label="Close">×</button></div>
            <p className="adm-earnings-modal__hint">This will correct payout #{correction.id} for exactly <strong>{formatEGP(correction.totalMinor)}</strong>. {correction.action === "VOID" ? "Its entries will return to pending and can be paid again." : "The original payout remains visible and a signed negative adjustment will be created."}</p>
            <label htmlFor="payout-correction-reason">Reason</label>
            <textarea id="payout-correction-reason" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Explain the accounting correction" rows={4} autoFocus required />
            <div className="adm-earnings-modal__actions"><button type="button" className="adm-btn" onClick={() => setCorrection(null)}>Cancel</button><button type="submit" className="adm-btn adm-btn--primary" disabled={busy || correctionReason.trim().length < 3}>{busy ? "Saving…" : `Confirm ${correction.action === "VOID" ? "void" : "reversal"}`}</button></div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
