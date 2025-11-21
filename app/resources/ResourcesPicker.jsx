// app/resources/ResourcesPicker.jsx
"use client";

import { useMemo, useState, useEffect } from "react";

// Helper: choose the best URL for a resource
function getPrimaryUrl(resource) {
  if (!resource) return null;
  if (resource.googleSlidesUrl) return resource.googleSlidesUrl;
  if (resource.youtubeUrl) return resource.youtubeUrl;
  if (resource.externalUrl) return resource.externalUrl;
  if (resource.fileUrl) return resource.fileUrl;
  return null;
}

// Find a unit (and its context) by ID inside the tracks tree
function findUnitWithContext(tracks, unitId) {
  for (const track of tracks || []) {
    for (const level of track.levels || []) {
      for (const subLevel of level.subLevels || []) {
        for (const unit of subLevel.units || []) {
          if (unit._id === unitId) {
            return { track, level, subLevel, unit };
          }
        }
      }
    }
  }
  return null;
}

export default function ResourcesPicker({ tracks }) {
  const { levelOptions, unitOptionsByLevelId } = useMemo(() => {
    const levelOptions = [];
    const unitOptionsByLevelId = {};

    (tracks || []).forEach((track) => {
      (track.levels || []).forEach((level) => {
        // Level dropdown option label: "Track – Level"
        levelOptions.push({
          value: level._id,
          label: `${track.name} – ${level.name}`,
          badge: level.code,
        });

        const unitsForLevel = [];

        (level.subLevels || []).forEach((subLevel) => {
          (subLevel.units || []).forEach((unit) => {
            unitsForLevel.push({
              value: unit._id,
              label: `${subLevel.code ? subLevel.code + " · " : ""}${
                unit.title
              }`,
              subLevelTitle: subLevel.title,
              summary: unit.summary,
              resources: unit.resources || [],
            });
          });
        });

        unitOptionsByLevelId[level._id] = unitsForLevel;
      });
    });

    return { levelOptions, unitOptionsByLevelId };
  }, [tracks]);

  const [selectedLevelId, setSelectedLevelId] = useState(
    levelOptions[0]?.value || ""
  );
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");

  const unitOptions = selectedLevelId
    ? unitOptionsByLevelId[selectedLevelId] || []
    : [];

  // If level changes, reset unit & resource to sensible defaults
  useEffect(() => {
    if (!unitOptions.length) {
      setSelectedUnitId("");
      setSelectedResourceId("");
      return;
    }
    setSelectedUnitId((prev) => {
      const stillExists = unitOptions.some((u) => u.value === prev);
      return stillExists ? prev : unitOptions[0].value;
    });
  }, [unitOptions]);

  // Get resources for currently selected unit
  const { unit, level, track, subLevel } = useMemo(() => {
    if (!selectedUnitId)
      return { unit: null, level: null, track: null, subLevel: null };
    const ctx = findUnitWithContext(tracks, selectedUnitId);
    return ctx || { unit: null, level: null, track: null, subLevel: null };
  }, [tracks, selectedUnitId]);

  const resources = unit?.resources || [];

  // Keep resource selection valid when unit changes
  useEffect(() => {
    if (!resources.length) {
      setSelectedResourceId("");
      return;
    }
    setSelectedResourceId((prev) => {
      const stillExists = resources.some((r) => r._id === prev);
      return stillExists ? prev : resources[0]._id;
    });
  }, [resources]);

  const selectedResource =
    resources.find((r) => r._id === selectedResourceId) || resources[0] || null;

  const resourceUrl = getPrimaryUrl(selectedResource);

  return (
    <div className="resources-layout">
      {/* LEFT: picker card */}
      <section className="resources-picker">
        <div className="resources-picker__header">
          <h2 className="resources-picker__title">Quick resource finder</h2>
          <p className="resources-picker__subtitle">
            Filter by level, then narrow down to the exact unit and resource you
            want to use.
          </p>
        </div>

        <div className="resources-picker__grid">
          {/* Level select */}
          <div className="resources-picker__field">
            <label className="resources-picker__label">Level</label>
            <div className="resources-picker__control">
              <select
                value={selectedLevelId}
                onChange={(e) => {
                  setSelectedLevelId(e.target.value);
                }}
              >
                {levelOptions.map((lvl) => (
                  <option key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="resources-picker__hint">
              First, choose the learner level.
            </p>
          </div>

          {/* Unit select */}
          <div className="resources-picker__field">
            <label className="resources-picker__label">Unit</label>
            <div className="resources-picker__control">
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                disabled={!unitOptions.length}
              >
                {unitOptions.length === 0 && (
                  <option value="">No units for this level yet</option>
                )}
                {unitOptions.map((unitOpt) => (
                  <option key={unitOpt.value} value={unitOpt.value}>
                    {unitOpt.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="resources-picker__hint">
              Then pick the exact unit you&apos;re preparing.
            </p>
          </div>

          {/* Resource select */}
          <div className="resources-picker__field resources-picker__field--full">
            <label className="resources-picker__label">Resource</label>
            <div className="resources-picker__control">
              <select
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                disabled={!resources.length}
              >
                {!resources.length && (
                  <option value="">No resources in this unit yet</option>
                )}
                {resources.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
            <p className="resources-picker__hint">
              Finally, choose the PDF, slides, or video you&apos;ll use.
            </p>
          </div>
        </div>
      </section>

      {/* RIGHT: preview card */}
      <section className="resources-preview">
        {!selectedUnitId ? (
          <div className="resources-preview__card resources-preview__card--empty resources-preview__card--animated">
            <h3>Choose a level & unit</h3>
            <p>
              Once you pick a level and unit, we’ll show you the resources
              available here.
            </p>
          </div>
        ) : !resources.length ? (
          <div className="resources-preview__card resources-preview__card--empty resources-preview__card--animated">
            <h3>No resources yet</h3>
            <p>
              This unit doesn&apos;t have any resources configured in Sanity
              right now.
            </p>
          </div>
        ) : (
          <div
            key={selectedResource?._id || unit?._id}
            className="resources-preview__card resources-preview__card--animated"
          >
            <div className="resources-preview__breadcrumbs">
              {track && <span>{track.name}</span>}
              {level && (
                <>
                  <span>•</span>
                  <span>{level.name}</span>
                </>
              )}
              {subLevel && (
                <>
                  <span>•</span>
                  <span>
                    {subLevel.code} – {subLevel.title}
                  </span>
                </>
              )}
            </div>

            <h3 className="resources-preview__title">
              {selectedResource?.title}
            </h3>

            {selectedResource?.description && (
              <p className="resources-preview__description">
                {selectedResource.description}
              </p>
            )}

            <div className="resources-preview__meta">
              {selectedResource?.kind && (
                <span className="resources-chip">{selectedResource.kind}</span>
              )}
              {selectedResource?.cecrLevel && (
                <span className="resources-chip resources-chip--primary">
                  CEFR {selectedResource.cecrLevel}
                </span>
              )}
              {selectedResource?.sourceType && (
                <span className="resources-chip">
                  {selectedResource.sourceType}
                </span>
              )}
            </div>

            {Array.isArray(selectedResource?.tags) &&
              selectedResource.tags.length > 0 && (
                <div className="resources-preview__tags">
                  {selectedResource.tags.map((tag) => (
                    <span key={tag} className="resources-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

            {selectedResource?.fileName && (
              <p className="resources-preview__filename">
                {selectedResource.fileName}
              </p>
            )}

            <div className="resources-preview__actions">
              {resourceUrl ? (
                <a
                  href={resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resources-button resources-button--primary"
                >
                  Open resource
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="resources-button resources-button--disabled"
                >
                  No URL configured
                </button>
              )}

              {unit?.slug && (
                <a
                  href={`/resources/units/${unit.slug}`}
                  className="resources-button resources-button--ghost"
                >
                  View unit page
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
