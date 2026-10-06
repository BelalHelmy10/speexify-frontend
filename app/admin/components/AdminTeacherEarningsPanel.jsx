"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";

function formatEGP(minor) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
}

function entryKey(row) {
  return `${row.entryType === "ADJUSTMENT" ? "adjustment" : "earning"}:${row.id}`;
}

function isSelectable(row) {
  return row.status === "PENDING" && (
    row.entryType === "ADJUSTMENT" || Number(row.amountMinor) > 0
  );
}

const PAGE_SIZE = 50;

export default function AdminTeacherEarningsPanel({ teacherId, teachers }) {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [errorCode, setErrorCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [payoutFormOpen, setPayoutFormOpen] = useState(false);
  const [adjustmentFormOpen, setAdjustmentFormOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [adjustmentDirection, setAdjustmentDirection] = useState("add");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const load = async () => {
    if (!teacherId) {
      setRows([]);
      setTotal(0);
      setSelected(new Set());
      setErrorCode(null);
      return;
    }
    setBusy(true);
    setErrorCode(null);
    try {
      const { data } = await api.get("/admin/teacher-earnings", {
        params: { teacherId, limit: PAGE_SIZE, offset: page * PAGE_SIZE, t: Date.now() },
      });
      setRows(Array.isArray(data?.entries) ? data.entries : []);
      setTotal(Number(data?.total) || 0);
      setSelected(new Set());
    } catch (error) {
      setRows([]);
      setErrorCode(error?.response?.data?.code || "LOAD_FAILED");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, [teacherId, page]);

  useEffect(() => {
    setPage(0);
  }, [teacherId]);

  const pending = useMemo(() => rows.filter((row) => row.status === "PENDING"), [rows]);
  const selectablePending = useMemo(() => pending.filter(isSelectable), [pending]);
  const unconfigured = useMemo(
    () => rows.filter((row) => row.entryType !== "ADJUSTMENT" && row.status === "PENDING" && Number(row.amountMinor) <= 0),
    [rows]
  );
  const selectedPending = useMemo(
    () => selectablePending.filter((row) => selected.has(entryKey(row))),
    [selectablePending, selected]
  );
  const selectedTotal = selectedPending.reduce((sum, row) => sum + Number(row.amountMinor || 0), 0);
  const pendingSessionTotal = pending
    .filter((row) => row.entryType !== "ADJUSTMENT")
    .reduce((sum, row) => sum + Number(row.amountMinor || 0), 0);
  const pendingAdjustmentTotal = pending
    .filter((row) => row.entryType === "ADJUSTMENT")
    .reduce((sum, row) => sum + Number(row.amountMinor || 0), 0);
  const teacher = teachers.find((item) => String(item.id) === String(teacherId));
  const allSelectableSelected = selectablePending.length > 0 && selectedPending.length === selectablePending.length;

  const toggle = (row) => {
    const key = entryKey(row);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = (checked) => {
    setSelected(checked ? new Set(selectablePending.map(entryKey)) : new Set());
  };

  const markPaid = async (event) => {
    event.preventDefault();
    if (selectedTotal <= 0) return;
    setBusy(true);
    try {
      await api.post("/admin/teacher-payouts", {
        teacherId: Number(teacherId),
        earningIds: selectedPending.filter((row) => row.entryType !== "ADJUSTMENT").map((row) => row.id),
        adjustmentIds: selectedPending.filter((row) => row.entryType === "ADJUSTMENT").map((row) => row.id),
        paymentMethod,
        paymentReference: paymentReference.trim() || null,
        note: paymentNote.trim() || null,
      });
      toast.success("Teacher payout recorded in EGP.");
      setPayoutFormOpen(false);
      setPaymentReference("");
      setPaymentNote("");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to record payout.");
      setBusy(false);
    }
  };

  const createAdjustment = async (event) => {
    event.preventDefault();
    const amount = Number(adjustmentAmount);
    const reason = adjustmentReason.trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a positive EGP amount.");
      return;
    }
    if (reason.length < 3) {
      toast.error("Add a reason for this adjustment.");
      return;
    }

    setBusy(true);
    try {
      await api.post("/admin/teacher-earnings/adjustments", {
        teacherId: Number(teacherId),
        amountMinor: Math.round(amount * 100) * (adjustmentDirection === "subtract" ? -1 : 1),
        reason,
      });
      toast.success("Teacher earnings adjustment added.");
      setAdjustmentFormOpen(false);
      setAdjustmentAmount("");
      setAdjustmentReason("");
      setAdjustmentDirection("add");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to add earnings adjustment.");
      setBusy(false);
    }
  };

  return (
    <section className="adm-earnings-panel">
      <div className="adm-earnings-panel__header">
        <div>
          <span className="adm-earnings-panel__eyebrow">Manual settlement</span>
          <h3>Teacher earnings · EGP</h3>
          <p>{teacher ? `Review and settle ${teacher.name || teacher.email}'s completed sessions.` : "Select one teacher above to review unpaid earnings."}</p>
        </div>
        {teacherId && (
          <div className="adm-earnings-panel__actions">
            <button type="button" className="adm-btn" disabled={busy} onClick={() => setAdjustmentFormOpen(true)}>Add adjustment</button>
            <button type="button" className="adm-btn adm-btn--primary" disabled={selectedTotal <= 0 || busy} onClick={() => setPayoutFormOpen(true)}>Mark as paid{selectedTotal > 0 ? ` · ${formatEGP(selectedTotal)}` : ""}</button>
          </div>
        )}
      </div>

      {!teacherId ? (
        <div className="adm-earnings-panel__empty">The settlement view is intentionally teacher-specific so every payout has a clear owner.</div>
      ) : busy && rows.length === 0 ? (
        <div className="adm-earnings-panel__empty">Loading earnings…</div>
      ) : errorCode === "EARNINGS_NOT_READY" ? (
        <div className="adm-earnings-panel__empty">Teacher earnings are being prepared. Deploy the earnings migration before settling payouts.</div>
      ) : errorCode ? (
        <div className="adm-earnings-panel__empty">We couldn’t load this teacher’s earnings. Try again.</div>
      ) : rows.length === 0 ? (
        <div className="adm-earnings-panel__empty">No completed earnings found for this teacher.</div>
      ) : (
        <>
          <div className="adm-earnings-panel__toolbar">
            <label><input type="checkbox" checked={allSelectableSelected} onChange={(event) => toggleAll(event.target.checked)} /> Select pending items</label>
            <div className="adm-earnings-panel__summary">
              <strong>{formatEGP(pendingSessionTotal + pendingAdjustmentTotal)} pending</strong>
              <small>{formatEGP(pendingSessionTotal)} sessions · {formatEGP(pendingAdjustmentTotal)} adjustments · EGP only</small>
            </div>
          </div>
          {unconfigured.length > 0 && <div className="adm-earnings-panel__warning">{unconfigured.length} completed session(s) need an EGP rate before they can be paid.</div>}
          <div className="adm-earnings-table-wrap">
            <table className="adm-earnings-table">
              <thead><tr><th></th><th>Item</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((row) => {
                  const selectable = isSelectable(row);
                  const adjustment = row.entryType === "ADJUSTMENT";
                  return (
                    <tr key={`${row.entryType}-${row.id}`}>
                      <td>{selectable ? <input type="checkbox" checked={selected.has(entryKey(row))} onChange={() => toggle(row)} aria-label={`Select ${row.title}`} /> : null}</td>
                      <td><strong>{adjustment ? "Manual adjustment" : row.title}</strong>{adjustment && row.reason ? <small className="adm-earnings-row-note">{row.reason}</small> : null}</td>
                      <td>{new Date(row.createdAt || row.startAt).toLocaleDateString("en-EG")}</td>
                      <td className={Number(row.amountMinor) < 0 ? "adm-earnings-amount--negative" : ""}>{formatEGP(row.amountMinor)}</td>
                      <td><span className={`adm-earnings-status adm-earnings-status--${row.status.toLowerCase()}${!adjustment && Number(row.amountMinor) <= 0 && row.status === "PENDING" ? " adm-earnings-status--missing" : ""}`}>{adjustment ? (row.status === "PAID" ? "Paid" : "Adjustment") : row.status === "PAID" ? "Paid" : Number(row.amountMinor) <= 0 ? "Rate missing" : "Awaiting payout"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {total > PAGE_SIZE ? (
            <div className="adm-earnings-panel__toolbar" aria-label="Earnings pagination">
              <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
              <div className="adm-earnings-panel__actions">
                <button type="button" className="adm-btn" disabled={page === 0 || busy} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
                <button type="button" className="adm-btn" disabled={(page + 1) * PAGE_SIZE >= total || busy} onClick={() => setPage((value) => value + 1)}>Next</button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {adjustmentFormOpen && (
        <div className="adm-earnings-modal-backdrop" role="presentation">
          <form className="adm-earnings-modal" onSubmit={createAdjustment}>
            <div className="adm-earnings-modal__head"><div><span className="adm-earnings-panel__eyebrow">Balance adjustment</span><h3>Adjust teacher earnings</h3></div><button type="button" className="adm-earnings-modal__close" onClick={() => setAdjustmentFormOpen(false)} aria-label="Close">×</button></div>
            <p className="adm-earnings-modal__hint">Add money for a missing earning, or subtract money to correct the balance. A reason is permanently recorded.</p>
            <label>Adjustment type<select value={adjustmentDirection} onChange={(event) => setAdjustmentDirection(event.target.value)}><option value="add">Add to balance</option><option value="subtract">Subtract from balance</option></select></label>
            <label>Amount (EGP)<input type="number" min="0.01" step="0.01" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} placeholder="150.00" autoFocus /></label>
            <label>Reason<textarea value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} placeholder="Explain why this adjustment is needed" rows={3} /></label>
            <div className="adm-earnings-modal__actions"><button type="button" className="adm-btn" onClick={() => setAdjustmentFormOpen(false)}>Cancel</button><button type="submit" className="adm-btn adm-btn--primary" disabled={busy}>Save adjustment</button></div>
          </form>
        </div>
      )}

      {payoutFormOpen && (
        <div className="adm-earnings-modal-backdrop" role="presentation">
          <form className="adm-earnings-modal" onSubmit={markPaid}>
            <div className="adm-earnings-modal__head"><div><span className="adm-earnings-panel__eyebrow">Confirm settlement</span><h3>Record {formatEGP(selectedTotal)} as paid</h3></div><button type="button" className="adm-earnings-modal__close" onClick={() => setPayoutFormOpen(false)} aria-label="Close">×</button></div>
            <p className="adm-earnings-modal__hint"><strong>Confirm the exact net amount: {formatEGP(selectedTotal)}.</strong> This settlement is recorded in the EGP ledger and cannot be edited. Use the payout history correction workflow if it is wrong.</p>
            <label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="wallet">Digital wallet</option><option value="other">Other</option></select></label>
            <label>Reference (optional)<input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Transfer reference" /></label>
            <label>Note (optional)<textarea value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Add a short internal note" rows={3} /></label>
            <div className="adm-earnings-modal__actions"><button type="button" className="adm-btn" onClick={() => setPayoutFormOpen(false)}>Cancel</button><button type="submit" className="adm-btn adm-btn--primary" disabled={busy}>Confirm payment</button></div>
          </form>
        </div>
      )}
    </section>
  );
}
