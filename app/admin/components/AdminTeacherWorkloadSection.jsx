"use client";

import TeacherWorkloadPanel from "./TeacherWorkloadPanel";

export default function AdminTeacherWorkloadSection({
  teacherIdFilter,
  setTeacherIdFilter,
  teachers,
  from,
  setFrom,
  to,
  setTo,
}) {
  return (
    <section className="adm-admin-card">
      <div className="adm-admin-card__header">
        <div className="adm-admin-card__title-group">
          <div className="adm-admin-card__icon adm-admin-card__icon--warning">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div>
            <h2 className="adm-admin-card__title">Teacher Workload</h2>
            <p className="adm-admin-card__subtitle">Monitor hours and payroll</p>
          </div>
        </div>
        <div className="adm-admin-card__actions">
          <select
            className="adm-filter-select"
            value={teacherIdFilter}
            onChange={(e) => setTeacherIdFilter(e.target.value)}
          >
            <option value="">All Teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.email}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="adm-filter-select"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            type="date"
            className="adm-filter-select"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <TeacherWorkloadPanel teacherId={teacherIdFilter} from={from} to={to} />
    </section>
  );
}
