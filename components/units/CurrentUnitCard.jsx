"use client";

// Dashboard card for the learner's current unit, with its lesson progress.
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { unitHref } from "./UnitParts";

export default function CurrentUnitCard({ group, prefix = "", labels }) {
  if (!group) return null;
  const percent = group.tracked ? Math.round((group.completed / group.tracked) * 100) : 0;
  const level = [group.level.course, group.level.band].filter(Boolean).join(" · ");
  return (
    <section className="dash-unit-card" aria-labelledby="dash-unit-card-title">
      <p className="dash-unit-card__kicker">
        <BookOpen size={14} aria-hidden="true" />
        <span id="dash-unit-card-title">{labels.title}</span>
      </p>
      {level && <p className="dash-unit-card__level" dir="auto">{level}</p>}
      <h3 className="dash-unit-card__name" dir="auto">
        {group.number != null && <span>{labels.unitNumber(group.number)} · </span>}
        {group.topic}
      </h3>
      {group.tracked > 0 && (
        <>
          <div
            className="dash-unit-card__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={group.tracked}
            aria-valuenow={group.completed}
            aria-label={labels.progress(group.completed, group.tracked)}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          <p className="dash-unit-card__progress">{labels.progress(group.completed, group.tracked)}</p>
        </>
      )}
      <div className="dash-unit-card__links">
        <Link href={unitHref(prefix, group.id)} className="dash-unit-card__cta">
          {labels.open}
        </Link>
        <Link href={`${prefix}/dashboard/units`} className="dash-unit-card__all">
          {labels.all}
        </Link>
      </div>
    </section>
  );
}
