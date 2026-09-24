// components/admin/AdminLearnerUsage.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import api from "@/lib/api";
import { useToast } from "@/components/ToastProvider";
import useAuth from "@/hooks/useAuth";
import { getDictionary, t } from "@/app/i18n";

export default function AdminLearnerUsage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const copy = getDictionary(user?.language === "ar" ? "ar" : "en", "admin");
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
          t(copy, "failedLearnerUsage")
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
            <div className="adm-admin-card__title">{t(copy, "learnerUsage")}</div>
            <div className="adm-admin-card__subtitle">
              {t(copy, "learnerUsageSubtitle")}
            </div>
          </div>

          <div className="adm-admin-card__actions">
            <button
              className="adm-btn adm-btn--ghost"
              onClick={fetchUsage}
              disabled={loading}
            >
              {t(copy, "refresh")}
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
              aria-label={t(copy, "searchLearnerUsage")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t(copy, "searchLearnerUsagePlaceholder")}
              style={{ maxWidth: 420 }}
            />
            {loading ? <span className="adm-muted">{t(copy, "loading")}</span> : null}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>{t(copy, "learner")}</th>
                  <th>{t(copy, "granted")}</th>
                  <th>{t(copy, "consumed")}</th>
                  <th>{t(copy, "remaining")}</th>
                  <th>{t(copy, "attended")}</th>
                  <th>{t(copy, "noShow")}</th>
                  <th>{t(copy, "lateCancel")}</th>
                  <th>{t(copy, "earlyCancel")}</th>
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
                      {t(copy, "noLearners")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="adm-muted" style={{ marginTop: 12 }}>
            {t(copy, "usagePolicy")}
          </div>
        </div>
      </div>
    </div>
  );
}
