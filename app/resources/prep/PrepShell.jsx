// app/resources/prep/PrepShell.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import PrepNotes from "./PrepNotes";

export default function PrepShell({ resource, viewer }) {
  const [focusMode, setFocusMode] = useState(false);

  const viewerUrl = viewer?.viewerUrl;
  const unit = resource.unit;
  const subLevel = unit?.subLevel;
  const level = subLevel?.level;
  const track = level?.track;

  return (
    <>
      {/* Breadcrumbs */}
      <nav className="unit-breadcrumbs prep-breadcrumbs">
        <Link href="/resources" className="unit-breadcrumbs__link">
          Resources
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
          Prep Room
        </span>
      </nav>

      <div className={"prep-layout" + (focusMode ? " prep-layout--focus" : "")}>
        {/* LEFT: info + notes */}
        <aside className="prep-info-card">
          <div className="prep-info-card__header">
            <h1 className="prep-info-card__title">{resource.title}</h1>
            {resource.fileName && (
              <p className="prep-info-card__filename">{resource.fileName}</p>
            )}
          </div>

          {resource.description && (
            <p className="prep-info-card__description">
              {resource.description}
            </p>
          )}

          <div className="prep-info-card__meta">
            {resource.kind && (
              <span className="resources-chip">{resource.kind}</span>
            )}
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
              href="/resources"
              className="resources-button resources-button--ghost"
            >
              Back to picker
            </Link>
            {unit?.slug && (
              <Link
                href={`/resources/units/${unit.slug}`}
                className="resources-button resources-button--ghost"
              >
                View unit page
              </Link>
            )}
            {viewer?.rawUrl && (
              <a
                href={viewer.rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="resources-button resources-button--primary"
              >
                Open raw link
              </a>
            )}
          </div>

          <PrepNotes resourceId={resource._id} />
        </aside>

        {/* RIGHT: viewer */}
        <section className="prep-viewer">
          {/* Focus toggle */}
          <button
            type="button"
            className="prep-viewer__focus-toggle"
            onClick={() => setFocusMode((v) => !v)}
          >
            {focusMode ? "Exit focus" : "Focus viewer"}
          </button>

          {viewerUrl ? (
            <>
              <div className="prep-viewer__badge">
                <span className="prep-viewer__badge-dot" />
                <span className="prep-viewer__badge-text">
                  Live preview · {viewer.label}
                </span>
              </div>
              <div className="prep-viewer__frame-wrapper">
                <iframe
                  src={viewerUrl}
                  className="prep-viewer__frame"
                  title={`${resource.title} – ${viewer.label}`}
                  allow={
                    viewer.type === "youtube"
                      ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      : undefined
                  }
                  allowFullScreen
                />
              </div>
            </>
          ) : (
            <div className="prep-viewer__placeholder">
              <h2>No preview available</h2>
              <p>
                This resource doesn&apos;t have an embeddable URL. Use the
                session notes on the left or open the raw link instead.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
