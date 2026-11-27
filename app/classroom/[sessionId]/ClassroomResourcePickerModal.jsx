"use client";

import {
  memo,
  useDeferredValue,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Clock, FileUp, Search, X } from "lucide-react";
import ClassroomResourcePicker from "./ClassroomResourcePicker";
import useFocusTrap from "@/hooks/useFocusTrap";
import {
  buildFlatResourceIndex,
  loadRecentResourceIds,
  pushRecentResourceId,
  searchEntries,
} from "./classroomFuzzySearch";
import { useClassroomText } from "./classroomText";

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

function ClassroomResourcePickerModal({
  isOpen,
  setIsPickerOpen,
  isTeacher,
  tracks,
  uploadedMaterials = [],
  maxPdfBytes = 25 * 1024 * 1024,
  onUploadPdf,
  canUploadPdf = true,
  selectedResourceId,
  handleChangeResourceId,
  sessionId,
}) {
  const ct = useClassroomText();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [recentIds, setRecentIds] = useState(() =>
    loadRecentResourceIds(sessionId)
  );

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const resultRefs = useRef(new Map());
  const modalRef = useFocusTrap(Boolean(isOpen && isTeacher), {
    onEscape: () => setIsPickerOpen(false),
    initialFocusRef: inputRef,
  });

  // Build the flat searchable index once per tracks change.
  const flatIndex = useMemo(() => buildFlatResourceIndex(tracks || []), [tracks]);
  const entriesById = useMemo(() => {
    const map = new Map();
    flatIndex.forEach((entry) => map.set(entry._id, entry));
    return map;
  }, [flatIndex]);

  const trimmedQuery = query.trim();
  const deferredQuery = useDeferredValue(trimmedQuery);
  const isSearching = trimmedQuery.length > 0;
  const visibleUploads = uploadedMaterials.filter((material) =>
    !isSearching || material.title.toLocaleLowerCase().includes(trimmedQuery.toLocaleLowerCase())
  );

  const handlePdfUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) || file.size === 0) {
      setUploadError(ct("cr_pk_invalid_pdf"));
      return;
    }
    if (file.size > maxPdfBytes) {
      setUploadError(ct("cr_pk_pdf_too_big", { mb: Math.floor(maxPdfBytes / (1024 * 1024)) }));
      return;
    }
    setUploadError("");
    setUploadProgress(0);
    setUploading(true);
    try {
      await onUploadPdf(file, setUploadProgress);
    } catch (error) {
      setUploadError(ct("cr_pk_upload_failed"));
    } finally {
      setUploading(false);
    }
  }, [onUploadPdf, maxPdfBytes]);

  const results = useMemo(() => {
    if (!deferredQuery) return [];
    return searchEntries(flatIndex, deferredQuery, SEARCH_LIMIT);
  }, [flatIndex, deferredQuery]);

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
    setUploadError("");
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
        ref={modalRef}
        className="cr-modal cr-modal--picker"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ct("cr_pk_title")}
      >
        <div className="cr-picker-search">
          <span className="cr-picker-search__icon" aria-hidden="true">
            <Search size={18} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="cr-picker-search__input"
            placeholder={ct("cr_pk_search_ph")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-label={ct("cr_pk_search")}
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
              aria-label={ct("cr_pk_clear")}
            >
              <X size={14} />
            </button>
          ) : null}
          <button
            type="button"
            className="cr-picker-search__close"
            onClick={() => setIsPickerOpen(false)}
            aria-label={ct("cr_close")}
          >
            ✕
          </button>
        </div>

        {canUploadPdf && (
          <div className="cr-picker-upload">
            <div>
              <strong>{ct("cr_pk_upload_title")}</strong>
              <span>{ct("cr_pk_upload_text", { mb: Math.floor(maxPdfBytes / (1024 * 1024)) })}</span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handlePdfUpload}
              hidden
              aria-label={ct("cr_pk_choose_pdf")}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <FileUp size={16} /> {uploading ? (uploadProgress >= 100 ? ct("cr_pk_preparing") : ct("cr_pk_uploading", { p: uploadProgress })) : ct("cr_pk_upload")}
            </button>
            {uploading && <p role="status" className="cr-picker-upload__status">{uploadProgress >= 100 ? ct("cr_pk_preparing_status") : ct("cr_pk_uploading_status", { p: uploadProgress })}</p>}
            {uploadError && <p role="alert" className="cr-picker-upload__error">{uploadError}</p>}
          </div>
        )}

        <div className="cr-modal__body cr-picker-body" data-lenis-prevent>
          {visibleUploads.length > 0 && (
            <div className="cr-picker-uploads">
              <strong>{ct("cr_pk_uploaded")}</strong>
              {visibleUploads.map((material) => (
                <button
                  type="button"
                  key={material._id}
                  className={material._id === selectedResourceId ? "is-selected" : ""}
                  onClick={() => handleChangeResourceId(material._id)}
                >
                  <span aria-hidden="true">📄</span> {material.title}
                </button>
              ))}
            </div>
          )}
          {isSearching ? (
            results.length === 0 ? (
              visibleUploads.length === 0 ? <div className="cr-picker__empty">
                <span className="cr-picker__empty-icon">🔎</span>
                <p>{ct("cr_pk_no_matches_for", { q: trimmedQuery })}</p>
                <p className="cr-picker__empty-hint">
                  {ct("cr_pk_no_matches_hint")}
                </p>
              </div> : null
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
                            aria-label={ct("cr_pk_current_aria")}
                          >
                            {ct("cr_pk_current")}
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
                    <span>{ct("cr_pk_recent")}</span>
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
                                {ct("cr_pk_current")}
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
                  <span>{ct("cr_pk_browse")}</span>
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
            <span>{ct("cr_pk_navigate")}</span>
          </span>
          <span className="cr-picker-kbd">
            <kbd>↵</kbd>
            <span>{ct("cr_pk_select")}</span>
          </span>
          <span className="cr-picker-kbd">
            <kbd>esc</kbd>
            <span>{ct("cr_close")}</span>
          </span>
          {isSearching && (
            <span className="cr-picker-footer__count">
              {results.length === 0
                ? ct("cr_pk_no_matches")
                : results.length === 1
                  ? ct("cr_pk_match_one")
                  : ct("cr_pk_matches", { n: results.length })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ClassroomResourcePickerModal);
