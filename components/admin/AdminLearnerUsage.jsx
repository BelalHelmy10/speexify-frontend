// components/admin/AdminLearnerUsage.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";

export default function AdminLearnerUsage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  const didFetchRef = useRef(false);
  const inFlightRef = useRef(false);

  const fetchUsage = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/learners/usage");
      setRows(data?.rows || []);
    } catch (e) {
      toast?.error?.(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to load learner usage"
      );
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [toast]);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    fetchUsage();
  }, [fetchUsage]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const name = (r.learner?.name || "").toLowerCase();
      const email = (r.learner?.email || "").toLowerCase();
      return name.includes(needle) || email.includes(needle);
    });
  }, [rows, q]);

  return (
    <div className="adm-admin-modern">
      <div className="adm-admin-card">
        <div className="adm-admin-card__header">
          <div className="adm-admin-card__title-group">
            <div className="adm-admin-card__title">Learner Usage</div>
            <div className="adm-admin-card__subtitle">
              Packages (granted) vs consumed vs remaining + attendance outcomes
            </div>
          </div>

          <div className="adm-admin-card__actions">
            <button
              className="adm-btn adm-btn--ghost"
              onClick={fetchUsage}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="adm-admin-card__body">
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <input
              className="adm-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search learner name or email…"
              style={{ maxWidth: 420 }}
            />
            {loading ? <span className="adm-muted">Loading…</span> : null}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Granted</th>
                  <th>Consumed</th>
                  <th>Remaining</th>
                  <th>Attended</th>
                  <th>No-show</th>
                  <th>Late cancel</th>
                  <th>Early cancel</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.learner.id}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <strong>{r.learner.name || "—"}</strong>
                        <span className="adm-muted">{r.learner.email}</span>
                      </div>
                    </td>
                    <td>{r.totalGranted}</td>
                    <td>{r.totalConsumed}</td>
                    <td>
                      <strong>{r.remaining}</strong>
                    </td>
                    <td>{r.attendedCount}</td>
                    <td>{r.noShowCount}</td>
                    <td>{r.lateCancelCount}</td>
                    <td>{r.earlyCancelCount}</td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="adm-muted"
                      style={{ padding: 16 }}
                    >
                      No learners found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="adm-muted" style={{ marginTop: 12 }}>
            Policy: attended = consume 1, no-show = consume 1, late cancel (&lt;
            6 hours) = consume 1, early cancel = 0.
          </div>
        </div>
      </div>
    </div>
  );
}
