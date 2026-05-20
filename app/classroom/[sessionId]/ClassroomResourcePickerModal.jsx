"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Clock, Search, X } from "lucide-react";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import {
  buildFlatResourceIndex,
  loadRecentResourceIds,
  pushRecentResourceId,
  searchEntries,
} from "./classroomFuzzySearch";

const SEARCH_LIMIT = 50;

function getResourceIcon(resource) {
  if (!resource) return "📁";

  const isPdfUrl = (url) =>
    typeof url === "string" && url.toLowerCase().endsWith(".pdf");

  if (resource.youtubeUrl) return "🎬";
  if (resource.googleSlidesUrl) return "📊";
  if (resource.externalUrl && isPdfUrl(resource.externalUrl)) return "📄";
  if (resource.fileUrl && isPdfUrl(resource.fileUrl)) return "📄";
  if (resource.externalUrl) return "🌐";
  if (resource.fileUrl) return "📁";

  const kind = (resource.kind || "").toLowerCase();
  if (kind.includes("worksheet") || kind.includes("exercise")) return "✏️";
  if (kind.includes("quiz") || kind.includes("test") || kind.includes("exam"))
    return "❓";
  if (kind.includes("audio")) return "🎧";
  if (kind.includes("video")) return "🎬";

  return "📁";
}

export default function ClassroomResourcePickerModal({
  isOpen,
  setIsPickerOpen,
  isTeacher,
  tracks,
  selectedResourceId,
  handleChangeResourceId,
  sessionId,
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState(() =>
    loadRecentResourceIds(sessionId)
  );

  const inputRef = useRef(null);
  const resultRefs = useRef(new Map());

  // Build the flat searchable index once per tracks change.
  const flatIndex = useMemo(() => buildFlatResourceIndex(tracks || []), [tracks]);
  const entriesById = useMemo(() => {
    const map = new Map();
    flatIndex.forEach((entry) => map.set(entry._id, entry));
    return map;
  }, [flatIndex]);

  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length > 0;

  const results = useMemo(() => {
    if (!isSearching) return [];
    return searchEntries(flatIndex, trimmedQuery, SEARCH_LIMIT);
  }, [flatIndex, trimmedQuery, isSearching]);

  const recentEntries = useMemo(() => {
    if (isSearching) return [];
    return recentIds
      .map((id) => entriesById.get(id))
      .filter(Boolean)
      .filter((entry) => entry._id !== selectedResourceId);
  }, [recentIds, entriesById, isSearching, selectedResourceId]);

  // ── Reset state when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setActiveIndex(0);
    setRecentIds(loadRecentResourceIds(sessionId));
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 40);
    return () => window.clearTimeout(id);
  }, [isOpen, sessionId]);

  // Clamp active index whenever results change.
  useEffect(() => {
    setActiveIndex((prev) => {
      if (!results.length) return 0;
      return Math.min(prev, results.length - 1);
    });
  }, [results]);

  // Keep the active row scrolled into view during arrow navigation.
  useEffect(() => {
    if (!isSearching) return;
    const row = resultRefs.current.get(activeIndex);
    if (row && typeof row.scrollIntoView === "function") {
      row.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isSearching]);

  // Close on Escape (modal-level, regardless of focus).
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsPickerOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, setIsPickerOpen]);

  const handleSelect = useCallback(
    (resourceId) => {
      if (!resourceId) return;
      const next = pushRecentResourceId(sessionId, resourceId);
      setRecentIds(next);
      handleChangeResourceId(resourceId);
    },
    [handleChangeResourceId, sessionId]
  );

  const handleInputKeyDown = useCallback(
    (e) => {
      if (!isSearching) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) =>
          results.length ? (i - 1 + results.length) % results.length : 0
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const winner = results[activeIndex];
        if (winner) handleSelect(winner.entry._id);
      }
    },
    [isSearching, results, activeIndex, handleSelect]
  );

  const registerResultRef = useCallback((index, node) => {
    if (node) {
      resultRefs.current.set(index, node);
    } else {
      resultRefs.current.delete(index);
    }
  }, []);

  if (!isOpen || !isTeacher) return null;

  return (
    <div className="cr-modal-overlay" onClick={() => setIsPickerOpen(false)}>
      <div
        className="cr-modal cr-modal--picker"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Choose a resource"
      >
        <div className="cr-picker-search">
          <span className="cr-picker-search__icon" aria-hidden="true">
            <Search size={18} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="cr-picker-search__input"
            placeholder="Search by resource, unit, level, or course…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search resources"
            aria-controls="cr-picker-results"
            aria-activedescendant={
              isSearching && results[activeIndex]
                ? `cr-picker-result-${results[activeIndex].entry._id}`
                : undefined
            }
          />
          {query ? (
            <button
              type="button"
              className="cr-picker-search__clear"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
          <button
            type="button"
            className="cr-picker-search__close"
            onClick={() => setIsPickerOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="cr-modal__body cr-picker-body" data-lenis-prevent>
          {isSearching ? (
            results.length === 0 ? (
              <div className="cr-picker__empty">
                <span className="cr-picker__empty-icon">🔎</span>
                <p>
                  No matches for <strong>“{trimmedQuery}”</strong>.
                </p>
                <p className="cr-picker__empty-hint">
                  Try a different word, or clear the search to browse.
                </p>
              </div>
            ) : (
              <ul
                id="cr-picker-results"
                className="cr-picker-results"
                role="listbox"
              >
                {results.map(({ entry }, idx) => {
                  const isSelected = entry._id === selectedResourceId;
                  const isActive = idx === activeIndex;
                  return (
                    <li key={entry._id}>
                      <button
                        ref={(node) => registerResultRef(idx, node)}
                        id={`cr-picker-result-${entry._id}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        className={[
                          "cr-picker-result",
                          isActive ? "cr-picker-result--active" : "",
                          isSelected ? "cr-picker-result--current" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => handleSelect(entry._id)}
                      >
                        <span
                          className="cr-picker-result__icon"
                          aria-hidden="true"
                        >
                          {getResourceIcon(entry.resource)}
                        </span>
                        <span className="cr-picker-result__body">
                          <span className="cr-picker-result__title">
                            {entry.title}
                          </span>
                          {entry.breadcrumb && (
                            <span className="cr-picker-result__breadcrumb">
                              {entry.breadcrumb}
                            </span>
                          )}
                        </span>
                        {isSelected && (
                          <span
                            className="cr-picker-result__badge"
                            aria-label="Currently shown"
                          >
                            Current
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            <>
              {recentEntries.length > 0 && (
                <div className="cr-picker-section">
                  <div className="cr-picker-section__header">
                    <Clock size={14} aria-hidden="true" />
                    <span>Recently used in this session</span>
                  </div>
                  <ul className="cr-picker-results cr-picker-results--compact">
                    {recentEntries.map((entry) => {
                      const isSelected = entry._id === selectedResourceId;
                      return (
                        <li key={entry._id}>
                          <button
                            type="button"
                            className={
                              "cr-picker-result" +
                              (isSelected ? " cr-picker-result--current" : "")
                            }
                            onClick={() => handleSelect(entry._id)}
                          >
                            <span
                              className="cr-picker-result__icon"
                              aria-hidden="true"
                            >
                              {getResourceIcon(entry.resource)}
                            </span>
                            <span className="cr-picker-result__body">
                              <span className="cr-picker-result__title">
                                {entry.title}
                              </span>
                              {entry.breadcrumb && (
                                <span className="cr-picker-result__breadcrumb">
                                  {entry.breadcrumb}
                                </span>
                              )}
                            </span>
                            {isSelected && (
                              <span className="cr-picker-result__badge">
                                Current
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="cr-picker-section">
                <div className="cr-picker-section__header cr-picker-section__header--browse">
                  <span>Browse by course</span>
                </div>
                <ClassroomResourcePicker
                  tracks={tracks}
                  selectedResourceId={selectedResourceId}
                  onChangeResourceId={handleSelect}
                  isTeacher={isTeacher}
                  sessionId={sessionId}
                />
              </div>
            </>
          )}
        </div>

        <div className="cr-picker-footer">
          <span className="cr-picker-kbd">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <span>Navigate</span>
          </span>
          <span className="cr-picker-kbd">
            <kbd>↵</kbd>
            <span>Select</span>
          </span>
          <span className="cr-picker-kbd">
            <kbd>esc</kbd>
            <span>Close</span>
          </span>
          {isSearching && (
            <span className="cr-picker-footer__count">
              {results.length === 0
                ? "No matches"
                : `${results.length} match${results.length === 1 ? "" : "es"}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
