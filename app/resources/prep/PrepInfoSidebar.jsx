// app/resources/prep/PrepInfoSidebar.jsx

import Link from "next/link";
import PrepNotes from "./PrepNotes";

export default function PrepInfoSidebar({
  show,
  resource,
  prefix,
  unit,
  locale,
  viewerRawUrl,
  backToPickerLabel,
  viewUnitLabel,
  openRawLabel,
}) {
  if (!show) return null;

  return (
    <aside className="prep-info-card">
      <div className="prep-info-card__header">
        <h1 className="prep-info-card__title">{resource.title}</h1>
        {resource.fileName && (
          <p className="prep-info-card__filename">{resource.fileName}</p>
        )}
      </div>

      {resource.description && (
        <p className="prep-info-card__description">{resource.description}</p>
      )}

      <div className="prep-info-card__meta">
        {resource.kind && <span className="resources-chip">{resource.kind}</span>}
        {resource.cecrLevel && (
          <span className="resources-chip resources-chip--primary">
            CEFR {resource.cecrLevel}
          </span>
        )}
        {resource.sourceType && (
          <span className="resources-chip">{resource.sourceType}</span>
        )}
      </div>

      {Array.isArray(resource.tags) && resource.tags.length > 0 && (
        <div className="prep-info-card__tags">
          {resource.tags.map((tag) => (
            <span key={tag} className="resources-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="prep-info-card__actions">
        <Link
          href={`${prefix}/resources`}
          className="resources-button resources-button--ghost"
        >
          {backToPickerLabel}
        </Link>

        {unit?.slug && (
          <Link
            href={`${prefix}/resources/units/${unit.slug}`}
            className="resources-button resources-button--ghost"
          >
            {viewUnitLabel}
          </Link>
        )}

        {viewerRawUrl && (
          <a
            href={viewerRawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="resources-button resources-button--primary"
          >
            {openRawLabel}
          </a>
        )}
      </div>

      <PrepNotes resourceId={resource._id} locale={locale} />
    </aside>
  );
}
