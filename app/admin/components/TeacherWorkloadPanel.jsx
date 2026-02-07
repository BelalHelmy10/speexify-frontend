"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function TeacherWorkloadPanel({ teacherId, from, to }) {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        const p = new URLSearchParams();
        if (teacherId) p.set("teacherId", String(teacherId));
        if (from) p.set("from", from);
        if (to) p.set("to", to);
        const { data } = await api.get(`/admin/teachers/workload?${p.toString()}`);
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load workload data", e);
        setRows([]);
      } finally {
        setBusy(false);
      }
    })();
  }, [teacherId, from, to]);

  if (busy) {
    return (
      <div className="adm-workload-skeleton">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="adm-workload-card skeleton-card">
            <div className="skeleton skeleton--chip" />
            <div className="skeleton skeleton--text" />
            <div className="skeleton skeleton--row" />
            <div className="skeleton skeleton--row" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className="adm-empty">No workload data available for this filter.</div>;
  }

  return (
    <div className="adm-workload-grid">
      {rows.map((w) => (
        <div key={w.teacher.id} className="adm-workload-card">
          <div className="adm-workload-card__header">
            <div className="adm-user-avatar adm-user-avatar--large">
              {w.teacher.name?.charAt(0) || w.teacher.email.charAt(0)}
            </div>
            <div className="adm-workload-card__info">
              <h3>{w.teacher.name || w.teacher.email}</h3>
              <p>{w.teacher.email}</p>
            </div>
          </div>
          <div className="adm-workload-stats">
            <div className="adm-workload-stat">
              <div className="adm-workload-stat__label">Sessions</div>
              <div className="adm-workload-stat__value">{w.sessions}</div>
            </div>
            <div className="adm-workload-stat">
              <div className="adm-workload-stat__label">Hours</div>
              <div className="adm-workload-stat__value">{w.hours}</div>
            </div>
            <div className="adm-workload-stat">
              <div className="adm-workload-stat__label">Rate/Hour</div>
              <div className="adm-workload-stat__value">${(w.rateHourlyCents / 100).toFixed(2)}</div>
            </div>
            <div className="adm-workload-stat adm-workload-stat--highlight">
              <div className="adm-workload-stat__label">Total Payroll</div>
              <div className="adm-workload-stat__value">${w.payrollAppliedUSD.toFixed(2)}</div>
            </div>
          </div>
          <div className="adm-workload-method">
            <span className="adm-badge-method">{w.method}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
