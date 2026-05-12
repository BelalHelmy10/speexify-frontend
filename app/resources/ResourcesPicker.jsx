// app/resources/ResourcesPicker.jsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  BookmarkCheck,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Link2,
  Music,
  Star,
  Video,
} from "lucide-react";
import api from "@/lib/api";
import { buildResourcePickerIndex } from "@/lib/resourcePickerIndex";
import { getDictionary, t } from "@/app/i18n";

const RECENT_RESOURCES_KEY = "speexify:resources:recent:v1";
const FAVORITE_RESOURCES_KEY = "speexify:resources:favorites:v1";
const PREPARED_RESOURCES_KEY = "speexify:resources:prepared:v1";
const MAX_OPERATIONAL_ITEMS = 8;

/* -----------------------------------------------------------
   Helper: Choose the primary URL for a resource
----------------------------------------------------------- */
function getPrimaryUrl(resource) {
  if (!resource) return null;
  if (resource.googleSlidesUrl) return resource.googleSlidesUrl;
  if (resource.youtubeUrl) return resource.youtubeUrl;
  if (resource.externalUrl) return resource.externalUrl;
  if (resource.fileUrl) return resource.fileUrl;
  return null;
}

function getResourceType(resource) {
  const source = String(resource?.sourceType || "").toLowerCase();
  const fileName = String(resource?.fileName || "").toLowerCase();

  if (
    resource?.audioUrl ||
    resource?.audioTracks?.length ||
    source.includes("audio")
  ) {
    return "audio";
  }
  if (resource?.youtubeUrl || source.includes("video")) {
    return "video";
  }
  if (resource?.googleSlidesUrl || source.includes("slide")) {
    return "slides";
  }
  if (resource?.externalUrl && !resource?.fileUrl) {
    return "link";
  }
  if (fileName.endsWith(".pdf")) {
    return "pdf";
  }
  return "file";
}

function ResourceTypeIcon({ resource }) {
  const type = getResourceType(resource);

  if (type === "audio") return <Music size={18} aria-hidden="true" />;
  if (type === "video") return <Video size={18} aria-hidden="true" />;
  if (type === "link") return <Link2 size={18} aria-hidden="true" />;
  return <FileText size={18} aria-hidden="true" />;
}

function safeReadList(key) {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function safeWriteList(key, list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Local storage is an enhancement only.
  }
}

function upsertOperationalItem(list, item, timestampField) {
  if (!item?.id) return list;
  const nextItem = {
    ...item,
    [timestampField]: new Date().toISOString(),
  };

  return [
    nextItem,
    ...(list || []).filter((entry) => entry.id !== item.id),
  ].slice(0, MAX_OPERATIONAL_ITEMS);
}

function removeOperationalItem(list, resourceId) {
  return (list || []).filter((entry) => entry.id !== resourceId);
}

function buildResourceContextIndex(tracks = []) {
  const index = {};

  (tracks || []).forEach((track) => {
    (track.levels || []).forEach((level) => {
      (level.subLevels || []).forEach((subLevel) => {
        (subLevel.units || []).forEach((unit) => {
          const bookLevel = unit.bookLevel || null;
          const book = bookLevel?.book || null;

          (unit.resources || []).forEach((resource) => {
            if (!resource?._id) return;
            index[resource._id] = {
              resource,
              track,
              level,
              subLevel,
              unit,
              bookLevel,
              book,
            };
          });
        });
      });
    });
  });

  return index;
}

function toOperationalItem(context) {
  if (!context?.resource?._id) return null;
  const { resource, track, unit, bookLevel, book } = context;

  return {
    id: resource._id,
    title: resource.title || "Untitled resource",
    description: resource.description || "",
    kind: resource.kind || "",
    cecrLevel: resource.cecrLevel || "",
    sourceType: resource.sourceType || "",
    tags: Array.isArray(resource.tags) ? resource.tags.slice(0, 3) : [],
    type: getResourceType(resource),
    trackId: track?._id || "",
    trackName: track?.name || "",
    bookId: book?._id || "",
    bookName: book?.title || "",
    bookLevelId: bookLevel?._id || "",
    unitId: unit?._id || "",
    unitTitle: unit?.title || "",
  };
}

function normalizeStoredItem(item, resourceIndex) {
  const resourceId = item?.id || item?._id || item?.resourceId;
  if (!resourceId) return null;
  const indexed = toOperationalItem(resourceIndex[resourceId]);

  return {
    ...(indexed || {}),
    ...item,
    id: String(resourceId),
    title:
      indexed?.title || item?.title || item?.resourceTitle || "Untitled resource",
    type: indexed?.type || item?.type || "file",
    unitTitle: indexed?.unitTitle || item?.unitTitle || "",
  };
}

/* -----------------------------------------------------------
   Helper: Find a unit (and its context) inside the tracks tree
----------------------------------------------------------- */
function findUnitWithContext(tracks, unitId) {
  if (!unitId) return null;

  for (const track of tracks || []) {
    for (const level of track.levels || []) {
      for (const subLevel of level.subLevels || []) {
        for (const unit of subLevel.units || []) {
          if (unit._id === unitId) {
            return {
              unit,
              track,
              level,
              subLevel,
            };
          }
        }
      }
    }
  }

  return null;
}

/* -----------------------------------------------------------
   MAIN COMPONENT
----------------------------------------------------------- */
export default function ResourcesPicker({ tracks, locale = "en" }) {
  const dict = getDictionary(locale, "resources");
  const prefix = locale === "ar" ? "/ar" : "";

  // Build the picker index (shared with classroom)
  const {
    trackOptions,
    booksByTrackId,
    bookLevelsByBookId,
    unitOptionsByBookLevelId,
    resourcesByUnitId,
  } = useMemo(() => buildResourcePickerIndex(tracks || []), [tracks]);

  // Selection state
  const [trackId, setTrackId] = useState("");
  const [bookId, setBookId] = useState("");
  const [bookLevelId, setBookLevelId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [recentResources, setRecentResources] = useState([]);
  const [favoriteResources, setFavoriteResources] = useState([]);
  const [preparedResources, setPreparedResources] = useState([]);
  const [lastSessionResources, setLastSessionResources] = useState([]);

  const resourceContextIndex = useMemo(
    () => buildResourceContextIndex(tracks || []),
    [tracks]
  );

  // Options derived from current selections
  const bookOptions = trackId ? booksByTrackId[trackId] || [] : [];
  const bookLevelOptions = bookId ? bookLevelsByBookId[bookId] || [] : [];
  const unitOptions = bookLevelId
    ? unitOptionsByBookLevelId[bookLevelId] || []
    : [];
  const resourceOptions = unitId ? resourcesByUnitId[unitId] || [] : [];

  useEffect(() => {
    setRecentResources(
      safeReadList(RECENT_RESOURCES_KEY)
        .map((item) => normalizeStoredItem(item, resourceContextIndex))
        .filter(Boolean)
    );
    setFavoriteResources(
      safeReadList(FAVORITE_RESOURCES_KEY)
        .map((item) => normalizeStoredItem(item, resourceContextIndex))
        .filter(Boolean)
    );
    setPreparedResources(
      safeReadList(PREPARED_RESOURCES_KEY)
        .map((item) => normalizeStoredItem(item, resourceContextIndex))
        .filter(Boolean)
    );
  }, [resourceContextIndex]);

  useEffect(() => {
    let cancelled = false;

    async function loadLastSessionResources() {
      try {
        const { data: sessions } = await api.get("/me/sessions", {
          params: { range: "past", limit: 5 },
        });
        const lastSession = Array.isArray(sessions)
          ? sessions.find((session) => session.status !== "canceled")
          : null;

        if (!lastSession?.id) {
          if (!cancelled) setLastSessionResources([]);
          return;
        }

        const { data } = await api.get(
          `/sessions/${lastSession.id}/resources-used`
        );
        const items = (data?.resources || [])
          .map((item) => normalizeStoredItem(item, resourceContextIndex))
          .filter(Boolean)
          .slice(0, MAX_OPERATIONAL_ITEMS);

        if (!cancelled) setLastSessionResources(items);
      } catch {
        if (!cancelled) setLastSessionResources([]);
      }
    }

    loadLastSessionResources();

    return () => {
      cancelled = true;
    };
  }, [resourceContextIndex]);

  /* ---------------------------------------------------------
     Cascading defaults: track → book → level → unit → resource
  --------------------------------------------------------- */

  // When tracks/index change, pick the first track
  useEffect(() => {
    if (!trackOptions.length) {
      setTrackId("");
      return;
    }

    setTrackId((prev) =>
      trackOptions.some((t) => t.value === prev) ? prev : trackOptions[0].value
    );
  }, [trackOptions]);

  // When track changes, choose first book for that track
  useEffect(() => {
    const list = booksByTrackId[trackId] || [];
    if (!list.length) {
      setBookId("");
      setBookLevelId("");
      setUnitId("");
      setSelectedResourceId("");
      return;
    }

    setBookId((prev) =>
      list.some((b) => b.value === prev) ? prev : list[0].value
    );
  }, [trackId, booksByTrackId]);

  // When book changes, choose first book level
  useEffect(() => {
    const list = bookLevelsByBookId[bookId] || [];
    if (!list.length) {
      setBookLevelId("");
      setUnitId("");
      setSelectedResourceId("");
      return;
    }

    setBookLevelId((prev) =>
      list.some((l) => l.value === prev) ? prev : list[0].value
    );
  }, [bookId, bookLevelsByBookId]);

  // When book level changes, choose first unit
  useEffect(() => {
    const list = unitOptionsByBookLevelId[bookLevelId] || [];
    if (!list.length) {
      setUnitId("");
      setSelectedResourceId("");
      return;
    }

    setUnitId((prev) =>
      list.some((u) => u.value === prev) ? prev : list[0].value
    );
  }, [bookLevelId, unitOptionsByBookLevelId]);

  // When unit changes, choose first resource
  useEffect(() => {
    const list = resourcesByUnitId[unitId] || [];
    if (!list.length) {
      setSelectedResourceId("");
      return;
    }

    setSelectedResourceId((prev) =>
      list.some((r) => r._id === prev) ? prev : list[0]._id
    );
  }, [unitId, resourcesByUnitId]);

  // Current selected resource
  const selectedResource =
    resourceOptions.find((r) => r._id === selectedResourceId) ||
    resourceOptions[0] ||
    null;

  // Context for breadcrumbs (track, level, subLevel, unit)
  const unitCtx = useMemo(
    () => findUnitWithContext(tracks, unitId),
    [tracks, unitId]
  );
  const currentUnit = unitCtx?.unit || null;
  const currentTrack = unitCtx?.track || null;
  const currentLevel = unitCtx?.level || null;
  const currentSubLevel = unitCtx?.subLevel || null;

  const primaryUrl = getPrimaryUrl(selectedResource);
  const selectedOperationalItem = selectedResource
    ? toOperationalItem(resourceContextIndex[selectedResource._id])
    : null;
  const favoriteIds = new Set(favoriteResources.map((item) => item.id));
  const isSelectedFavorite = selectedResource
    ? favoriteIds.has(selectedResource._id)
    : false;
  const resourceCount = resourceOptions.length;
  const resourceCountLabel =
    resourceCount === 1
      ? t(dict, "resources_browser_count_one")
      : t(dict, "resources_browser_count_many", { count: resourceCount });

  const saveRecentResource = (item) => {
    if (!item?.id) return;
    setRecentResources((current) => {
      const next = upsertOperationalItem(current, item, "openedAt");
      safeWriteList(RECENT_RESOURCES_KEY, next);
      return next;
    });
  };

  const savePreparedResource = (item) => {
    if (!item?.id) return;
    setPreparedResources((current) => {
      const next = upsertOperationalItem(current, item, "preparedAt");
      safeWriteList(PREPARED_RESOURCES_KEY, next);
      return next;
    });
    saveRecentResource(item);
  };

  const toggleFavoriteResource = () => {
    if (!selectedOperationalItem?.id) return;
    setFavoriteResources((current) => {
      const exists = current.some(
        (item) => item.id === selectedOperationalItem.id
      );
      const next = exists
        ? removeOperationalItem(current, selectedOperationalItem.id)
        : upsertOperationalItem(current, selectedOperationalItem, "starredAt");
      safeWriteList(FAVORITE_RESOURCES_KEY, next);
      return next;
    });
  };

  const selectResourceById = (resourceId, { trackRecent = true } = {}) => {
    const context = resourceContextIndex[resourceId];
    if (!context) return;

    setTrackId(context.track?._id || "");
    setBookId(context.book?._id || "");
    setBookLevelId(context.bookLevel?._id || "");
    setUnitId(context.unit?._id || "");
    setSelectedResourceId(resourceId);

    if (trackRecent) {
      saveRecentResource(toOperationalItem(context));
    }
  };

  // Prep Room link – this MUST carry a real resourceId
  const prepHref = selectedResource
    ? {
        pathname: `${prefix}/resources/prep`,
        query: {
          resourceId: selectedResource._id,
          unitId: currentUnit?._id,
        },
      }
    : null;

  // Unit page link
  const unitHref =
    currentUnit && currentUnit.slug
      ? {
          pathname: `/resources/units/${currentUnit.slug}`,
        }
      : null;

  const hasResources = resourceOptions.length > 0;

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */

  return (
    <>
      <section className="resources-workbench" aria-label="Resource shortcuts">
        <OperationalShelf
          icon={<History size={18} aria-hidden="true" />}
          title={t(dict, "resources_shelf_recent_title")}
          emptyText={t(dict, "resources_shelf_recent_empty")}
          items={recentResources}
          onSelect={selectResourceById}
        />
        <OperationalShelf
          icon={<Star size={18} aria-hidden="true" />}
          title={t(dict, "resources_shelf_favorites_title")}
          emptyText={t(dict, "resources_shelf_favorites_empty")}
          items={favoriteResources}
          onSelect={selectResourceById}
        />
        <OperationalShelf
          icon={<Clock3 size={18} aria-hidden="true" />}
          title={t(dict, "resources_shelf_last_session_title")}
          emptyText={t(dict, "resources_shelf_last_session_empty")}
          items={lastSessionResources}
          onSelect={selectResourceById}
        />
        <OperationalShelf
          icon={<BookmarkCheck size={18} aria-hidden="true" />}
          title={t(dict, "resources_shelf_prepared_title")}
          emptyText={t(dict, "resources_shelf_prepared_empty")}
          items={preparedResources}
          onSelect={selectResourceById}
        />
      </section>

      <div className="resources-layout">
        {/* LEFT: Filters */}
        <section className="resources-picker">
          <div className="resources-picker__header">
            <h2 className="resources-picker__title">
              {t(dict, "resources_picker_title")}
            </h2>
            <p className="resources-picker__subtitle">
              {t(dict, "resources_picker_subtitle")}
            </p>
          </div>

          <div className="resources-picker__grid">
            {/* Track */}
            <div className="resources-picker__field">
              <label className="resources-picker__label">
                {t(dict, "resources_field_track")}
              </label>
              <div className="resources-picker__control">
                <select
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                >
                  {trackOptions.map((tOpt) => (
                    <option key={tOpt.value} value={tOpt.value}>
                      {tOpt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Book */}
            <div className="resources-picker__field">
              <label className="resources-picker__label">
                {t(dict, "resources_field_book")}
              </label>
              <div className="resources-picker__control">
                <select
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  disabled={!bookOptions.length}
                >
                  {!bookOptions.length && <option>—</option>}
                  {bookOptions.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Book Level */}
            <div className="resources-picker__field">
              <label className="resources-picker__label">
                {t(dict, "resources_field_level")}
              </label>
              <div className="resources-picker__control">
                <select
                  value={bookLevelId}
                  onChange={(e) => setBookLevelId(e.target.value)}
                  disabled={!bookLevelOptions.length}
                >
                  {!bookLevelOptions.length && <option>—</option>}
                  {bookLevelOptions.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Unit */}
            <div className="resources-picker__field">
              <label className="resources-picker__label">
                {t(dict, "resources_field_unit")}
              </label>
              <div className="resources-picker__control">
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  disabled={!unitOptions.length}
                >
                  {!unitOptions.length && <option>—</option>}
                  {unitOptions.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

      {/* CENTER: Resource browser */}
      <section className="resources-browser">
        <div className="resources-browser__header">
          <div>
            <p className="resources-browser__eyebrow">
              {currentUnit?.title || t(dict, "resources_browser_no_unit")}
            </p>
            <h2 className="resources-browser__title">
              {t(dict, "resources_browser_title")}
            </h2>
            <p className="resources-browser__subtitle">
              {t(dict, "resources_browser_subtitle")}
            </p>
          </div>
          <span className="resources-browser__count">{resourceCountLabel}</span>
        </div>

        {!hasResources ? (
          <div className="resources-browser__empty">
            <h3>{t(dict, "resources_browser_empty_title")}</h3>
            <p>{t(dict, "resources_browser_empty_text")}</p>
          </div>
        ) : (
          <div className="resources-browser__grid">
            {resourceOptions.map((resource) => {
              const isSelected = resource._id === selectedResource?._id;
              const type = getResourceType(resource);
              const title =
                resource.title || t(dict, "resources_preview_title_fallback");

              return (
                <button
                  key={resource._id}
                  type="button"
                  className={`resources-browser-card${
                    isSelected ? " resources-browser-card--selected" : ""
                  }`}
                  onClick={() => selectResourceById(resource._id)}
                  aria-pressed={isSelected}
                >
                  <span className="resources-browser-card__icon">
                    <ResourceTypeIcon resource={resource} />
                  </span>

                  <span className="resources-browser-card__body">
                    <span className="resources-browser-card__topline">
                      <span className="resources-browser-card__type">
                        {t(dict, `resources_type_${type}`)}
                      </span>
                      {isSelected && (
                        <span className="resources-browser-card__selected">
                          <CheckCircle2 size={14} aria-hidden="true" />
                          {t(dict, "resources_browser_selected")}
                        </span>
                      )}
                    </span>

                    <span className="resources-browser-card__title">
                      {title}
                    </span>

                    {resource.description && (
                      <span className="resources-browser-card__description">
                        {resource.description}
                      </span>
                    )}

                    <span className="resources-browser-card__meta">
                      {resource.kind && <span>{resource.kind}</span>}
                      {resource.cecrLevel && (
                        <span>
                          {t(dict, "resources_meta_cefr", {
                            level: resource.cecrLevel,
                          })}
                        </span>
                      )}
                      {Array.isArray(resource.tags) &&
                        resource.tags.slice(0, 2).map((tag) => (
                          <span key={tag}>#{tag}</span>
                        ))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* RIGHT: Preview Card */}
      <section className="resources-preview">
        {!selectedResource || !hasResources ? (
          <div className="resources-preview__card resources-preview__card--empty">
            <h3>{t(dict, "resources_preview_no_resource_title")}</h3>
            <p>{t(dict, "resources_preview_no_resource_text")}</p>
          </div>
        ) : (
          <div className="resources-preview__card resources-preview__card--animated">
            {/* Breadcrumbs */}
            <div className="resources-preview__breadcrumbs">
              {currentTrack && <span>{currentTrack.name}</span>}
              {currentUnit?.bookLevel?.book && <span>·</span>}
              {currentUnit?.bookLevel?.book && (
                <span>{currentUnit.bookLevel.book.title}</span>
              )}
              {currentLevel && <span>·</span>}
              {currentLevel && <span>{currentLevel.name}</span>}
              {currentSubLevel && <span>·</span>}
              {currentSubLevel && <span>{currentSubLevel.title}</span>}
              {currentUnit && <span>·</span>}
              {currentUnit && <span>{currentUnit.title}</span>}
            </div>

            {/* Title + description */}
            <div className="resources-preview__title-row">
              <h3 className="resources-preview__title">
                {selectedResource.title ||
                  t(dict, "resources_preview_title_fallback")}
              </h3>
              <button
                type="button"
                className={`resources-preview__favorite${
                  isSelectedFavorite
                    ? " resources-preview__favorite--active"
                    : ""
                }`}
                onClick={toggleFavoriteResource}
                aria-pressed={isSelectedFavorite}
                aria-label={
                  isSelectedFavorite
                    ? t(dict, "resources_unfavorite_label")
                    : t(dict, "resources_favorite_label")
                }
              >
                <Star size={18} aria-hidden="true" />
              </button>
            </div>

            {selectedResource.description && (
              <p className="resources-preview__description">
                {selectedResource.description}
              </p>
            )}

            {/* Meta chips */}
            <div className="resources-preview__meta">
              {selectedResource.kind && (
                <span className="resources-chip resources-chip--primary">
                  {t(dict, "resources_meta_kind", {
                    kind: selectedResource.kind,
                  })}
                </span>
              )}
              {selectedResource.cecrLevel && (
                <span className="resources-chip resources-chip--success">
                  {t(dict, "resources_meta_cefr", {
                    level: selectedResource.cecrLevel,
                  })}
                </span>
              )}
              {selectedResource.sourceType && (
                <span className="resources-chip">
                  {t(dict, "resources_meta_source", {
                    sourceType: selectedResource.sourceType,
                  })}
                </span>
              )}
            </div>

            {/* Tags */}
            {Array.isArray(selectedResource.tags) &&
              selectedResource.tags.length > 0 && (
                <div className="resources-preview__tags">
                  {selectedResource.tags.map((tag) => (
                    <span key={tag} className="resources-tag">
                      {t(dict, "resources_tag", { tag })}
                    </span>
                  ))}
                </div>
              )}

            {/* File name */}
            {selectedResource.fileName && (
              <p className="resources-preview__filename">
                {t(dict, "resources_filename", {
                  fileName: selectedResource.fileName,
                })}
              </p>
            )}

            {/* Actions */}
            <div className="resources-preview__actions">
              {/* Open in Prep Room */}
              {prepHref ? (
                <Link
                  href={prepHref}
                  className="resources-button resources-button--primary"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => savePreparedResource(selectedOperationalItem)}
                >
                  <span>{t(dict, "resources_btn_open_prep")}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="resources-button resources-button--disabled"
                  disabled
                >
                  {t(dict, "resources_btn_choose_resource_first")}
                </button>
              )}

              {/* Open unit page */}
              {unitHref ? (
                <Link
                  href={unitHref}
                  className="resources-button resources-button--ghost"
                  onClick={() => saveRecentResource(selectedOperationalItem)}
                >
                  <span>{t(dict, "resources_btn_open_unit")}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="resources-button resources-button--disabled"
                  disabled
                >
                  {t(dict, "resources_btn_unit_unavailable")}
                </button>
              )}

              {/* Open original file/link */}
              {primaryUrl ? (
                <a
                  href={primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resources-button resources-button--ghost"
                  onClick={() => saveRecentResource(selectedOperationalItem)}
                >
                  <span>{t(dict, "resources_btn_open_original")}</span>
                </a>
              ) : (
                <button
                  type="button"
                  className="resources-button resources-button--disabled"
                  disabled
                >
                  {t(dict, "resources_btn_no_link")}
                </button>
              )}
            </div>
          </div>
        )}
        </section>
      </div>
    </>
  );
}

function OperationalShelf({ icon, title, emptyText, items, onSelect }) {
  const visibleItems = (items || []).slice(0, 3);

  return (
    <article className="resources-shelf">
      <div className="resources-shelf__header">
        <span className="resources-shelf__icon">{icon}</span>
        <h3>{title}</h3>
      </div>

      {visibleItems.length === 0 ? (
        <p className="resources-shelf__empty">{emptyText}</p>
      ) : (
        <div className="resources-shelf__list">
          {visibleItems.map((item) => {
            const canSelect = Boolean(item.unitId);
            return (
              <button
                key={item.id}
                type="button"
                className="resources-shelf__item"
                onClick={() => canSelect && onSelect(item.id)}
                disabled={!canSelect}
              >
                <span>{item.title}</span>
                <small>{item.unitTitle || item.type}</small>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}
