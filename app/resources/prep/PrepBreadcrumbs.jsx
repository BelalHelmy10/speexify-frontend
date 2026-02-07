// app/resources/prep/PrepBreadcrumbs.jsx

import Link from "next/link";

export default function PrepBreadcrumbs({
  show,
  prefix,
  track,
  level,
  subLevel,
  unit,
  rootLabel,
  prepRoomLabel,
}) {
  if (!show) return null;

  return (
    <nav className="unit-breadcrumbs prep-breadcrumbs">
      <Link href={`${prefix}/resources`} className="unit-breadcrumbs__link">
        {rootLabel}
      </Link>

      {track && (
        <>
          <span className="unit-breadcrumbs__separator">/</span>
          <span className="unit-breadcrumbs__crumb">{track.name}</span>
        </>
      )}

      {level && (
        <>
          <span className="unit-breadcrumbs__separator">/</span>
          <span className="unit-breadcrumbs__crumb">{level.name}</span>
        </>
      )}

      {subLevel && (
        <>
          <span className="unit-breadcrumbs__separator">/</span>
          <span className="unit-breadcrumbs__crumb">
            {subLevel.code} – {subLevel.title}
          </span>
        </>
      )}

      {unit && (
        <>
          <span className="unit-breadcrumbs__separator">/</span>
          <span className="unit-breadcrumbs__crumb">{unit.title}</span>
        </>
      )}

      <span className="unit-breadcrumbs__separator">/</span>
      <span className="unit-breadcrumbs__crumb prep-breadcrumbs__current">
        {prepRoomLabel}
      </span>
    </nav>
  );
}
