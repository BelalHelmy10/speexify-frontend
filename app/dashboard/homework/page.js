"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList } from "lucide-react";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { HomeworkStatusPill, ProgressBar } from "@/components/homework/HomeworkBits";
import { formatDue, homeworkCopy, isOverdue, localeFromPath, relativeTime } from "@/components/homework/homeworkCopy";
import "@/styles/homework.scss";

export default function HomeworkListPage() {
  const pathname = usePathname();
  const locale = localeFromPath(pathname);
  const prefix = locale === "ar" ? "/ar" : "";
  const c = homeworkCopy(locale);
  const { user, checking } = useAuth();
  const [state, setState] = useState({ loading: true, error: "", viewer: "learner", items: [] });

  useEffect(() => {
    if (checking || !user) return;
    let alive = true;
    api
      .get("/homework")
      .then((res) => alive && setState({ loading: false, error: "", viewer: res.data.viewer, items: res.data.assignments || [] }))
      .catch((e) => alive && setState((s) => ({ ...s, loading: false, error: e?.response?.data?.error || c.loadError })));
    return () => {
      alive = false;
    };
  }, [checking, user, c.loadError]);

  const teacher = state.viewer === "teacher";
  const groups = useMemo(() => {
    const byDue = (a, b) => new Date(a.dueAt || 8.64e15) - new Date(b.dueAt || 8.64e15);
    const open = state.items.filter((i) => i.status === "ASSIGNED" || i.status === "IN_PROGRESS").sort(byDue);
    const submitted = state.items.filter((i) => i.status === "SUBMITTED");
    const reviewed = state.items.filter((i) => i.status === "REVIEWED");
    // Teachers see work waiting for review first.
    return teacher
      ? [
          { key: "submitted", title: c.submitted, items: submitted },
          { key: "open", title: c.toDo, items: open },
          { key: "reviewed", title: c.reviewed, items: reviewed },
        ]
      : [
          { key: "open", title: c.toDo, items: open },
          { key: "submitted", title: c.submitted, items: submitted },
          { key: "reviewed", title: c.reviewed, items: reviewed },
        ];
  }, [state.items, teacher, c]);

  return (
    <main className="container hw-page" dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className="hw-page__head">
        <span className="hw-page__icon" aria-hidden><ClipboardList size={22} /></span>
        <div>
          <h1>{teacher ? c.assigned : c.myHomework}</h1>
        </div>
      </header>

      {(checking || state.loading) && <p className="hw-muted">{c.loading}</p>}
      {state.error && <p className="hw-error" role="alert">{state.error}</p>}

      {!state.loading && !state.error && state.items.length === 0 && (
        <div className="hw-empty">
          <p>{teacher ? c.emptyTeacher : c.emptyLearner}</p>
        </div>
      )}

      {!state.loading &&
        state.items.length > 0 &&
        groups.map((group) =>
          group.items.length ? (
            <section key={group.key} className="hw-group">
              <h2 className="hw-subhead">
                {group.title} <span className="hw-count">{group.items.length}</span>
              </h2>
              <div className="hw-list">
                {group.items.map((a) => (
                  <Link key={a.id} href={`${prefix}/dashboard/homework/${a.id}`} className="hw-row">
                    <span className="hw-row__main">
                      <strong>{a.title} <span className="hw-level hw-level--small">{a.level}</span></strong>
                      <span className="hw-row__meta">
                        {teacher && a.learner ? `${a.learner.name} · ` : ""}
                        {a.dueAt ? `${isOverdue(a) ? c.overdue : c.due}: ${formatDue(a.dueAt, locale)}` : c.noDue}
                        {teacher && ` · ${c.lastActive}: ${a.lastActivityAt ? relativeTime(a.lastActivityAt, locale) : c.never}`}
                      </span>
                    </span>
                    <span className="hw-row__progress">
                      <ProgressBar done={a.completedTasks} total={a.taskCount} />
                      <span className="hw-row__count">{c.tasksDone(a.completedTasks, a.taskCount)}</span>
                    </span>
                    <HomeworkStatusPill status={a.status} overdue={isOverdue(a)} locale={locale} />
                  </Link>
                ))}
              </div>
            </section>
          ) : null
        )}
    </main>
  );
}
