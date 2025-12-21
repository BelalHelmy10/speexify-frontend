// app/resources/prep/PdfViewerWithSidebar.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getDictionary, t } from "@/app/i18n";

export default function PdfViewerWithSidebar({
  fileUrl,
  onFatalError,
  children,
  onContainerReady,
  hideControls = false,
  hideSidebar = false,
  locale = "en",
  // NEW: External nav support
  externalNav = false,
  onNavStateChange,
  // ✅ NEW: expose the scroll container (mainRef)
  onScrollContainerReady,

  // ✅ NEW: notify parent when "fit to page" is triggered (for classroom sync)
  onFitToPage,
}) {
  const mainRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const pageWrapperRef = useRef(null);

  const [pdfjs, setPdfjs] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dict = getDictionary(locale, "resources");
  const renderTaskRef = useRef(null);

  // Updated (after change) - 10% steps, min 10%
  const MIN_ZOOM = 0.1; // 10%
  const MAX_ZOOM = 3.0; // Keep 300% max, or adjust if needed (e.g., to 5.0 for 500%)
  const ZOOM_STEP = 0.1; // 10% steps

  // UPDATED: Function to fit the PDF to the width (fits width to container)
  const fitToPage = useCallback(() => {
    if (!pdfDoc || !pageWrapperRef.current || !mainRef.current) return;

    pdfDoc.getPage(currentPage).then((page) => {
      const viewport = page.getViewport({ scale: 1.0 });
      const containerWidth = mainRef.current.clientWidth - 20; // Subtract padding/margins if needed (adjust based on CSS)
      const fitZoom = containerWidth / viewport.width;
      setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fitZoom)));
    });
  }, [pdfDoc, currentPage]);

  // Expose the page wrapper element to parent
  const updateContainerRef = useCallback(() => {
    if (typeof onContainerReady === "function" && pageWrapperRef.current) {
      onContainerReady(pageWrapperRef.current);
    }
  }, [onContainerReady]);

  useEffect(() => {
    updateContainerRef();
  }, [updateContainerRef]);

  // ✅ Expose the scroll container element to parent
  const updateScrollContainerRef = useCallback(() => {
    if (typeof onScrollContainerReady === "function" && mainRef.current) {
      onScrollContainerReady(mainRef.current);
    }
  }, [onScrollContainerReady]);

  useEffect(() => {
    updateScrollContainerRef();
  }, [updateScrollContainerRef]);

  // NEW: Notify parent of nav state changes, including fitToPage
  useEffect(() => {
    if (typeof onNavStateChange === "function") {
      onNavStateChange({
        currentPage,
        numPages,
        zoom,
        canGoPrev: currentPage > 1,
        canGoNext: currentPage < numPages,
        goPrevPage: () => setCurrentPage((p) => Math.max(1, p - 1)),
        goNextPage: () => setCurrentPage((p) => Math.min(numPages, p + 1)),
        zoomIn: () =>
          setZoom((z) =>
            Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100)
          ),
        zoomOut: () =>
          setZoom((z) =>
            Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100)
          ),
        zoomFit: () => setZoom(1.0),
        fitToPage, // NEW: Expose fitToPage
        setPage: (page) =>
          setCurrentPage(Math.max(1, Math.min(numPages, page))),
      });
    }
  }, [currentPage, numPages, zoom, onNavStateChange, fitToPage]);

  // Load pdf.js lazily
  useEffect(() => {
    if (!fileUrl) return;

    let cancelled = false;

    async function loadPdfJs() {
      try {
        const mod = await import("pdfjs-dist/build/pdf");
        const pdfjsLib = mod.default || mod;

        if (typeof window !== "undefined") {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        if (!cancelled) {
          setPdfjs(pdfjsLib);
        }
      } catch (err) {
        console.error("Failed to load pdf.js", err);
        if (!cancelled) {
          setError(t(dict, "resources_pdf_engine_error"));
          setLoading(false);
          onFatalError?.(err);
        }
      }
    }

    loadPdfJs();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, onFatalError, dict]);

  // Load the PDF document
  useEffect(() => {
    if (!pdfjs || !fileUrl) return;

    let cancelled = false;

    async function loadDocument() {
      setLoading(true);
      setError(null);
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);

      try {
        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          disableRange: true,
          disableStream: true,
          withCredentials: false,
        });

        const doc = await loadingTask.promise;
        if (cancelled) {
          try {
            doc.destroy();
          } catch (_) {}
          return;
        }

        setPdfDoc(doc);
        setNumPages(doc.numPages || 0);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load PDF document:", err);
        if (!cancelled) {
          let msg = t(dict, "resources_pdf_load_generic_error");

          if (err.message?.includes("Missing PDF")) {
            msg = t(dict, "resources_pdf_missing_error");
          } else if (err.message?.includes("Invalid PDF")) {
            msg = t(dict, "resources_pdf_invalid_error");
          } else if (err.name === "MissingPDFException") {
            msg = t(dict, "resources_pdf_missing_error");
          } else if (
            err.message?.includes("fetch") ||
            err.message?.includes("network")
          ) {
            msg = t(dict, "resources_pdf_network_error");
          }

          setError(msg);
          setLoading(false);
          onFatalError?.(err);
        }
      }
    }

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [pdfjs, fileUrl]);

  // Render the current page
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;

    let cancelled = false;

    async function renderPage() {
      setLoading(true);
      setError(null);

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (_) {}
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const canvas = pdfCanvasRef.current;
        const context = canvas.getContext("2d");

        const devicePixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: zoom });
        const outputScale = devicePixelRatio;

        canvas.width = viewport.width * outputScale;
        canvas.height = viewport.height * outputScale;

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        const renderContext = {
          canvasContext: context,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        if (!cancelled) {
          setLoading(false);
          updateContainerRef();
        }
      } catch (err) {
        if (cancelled) return;
        if (err.name === "RenderingCancelledException") return;

        console.error("Failed to render PDF page:", err);
        setError(t(dict, "resources_pdf_render_error"));
        setLoading(false);
      } finally {
        renderTaskRef.current = null;
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (_) {}
      }
    };
  }, [pdfDoc, currentPage, zoom, updateContainerRef, dict]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        try {
          pdfDoc.destroy();
        } catch (_) {}
      }
    };
  }, [pdfDoc]);

  // Controls (for internal use only when not using external nav)
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < numPages;

  function goPrevPage() {
    if (!canGoPrev) return;
    setCurrentPage((p) => Math.max(1, p - 1));
  }

  function goNextPage() {
    if (!canGoNext) return;
    setCurrentPage((p) => Math.min(numPages, p + 1));
  }

  function zoomOut() {
    setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100));
  }

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100));
  }

  function zoomFit() {
    setZoom(1.0);
  }

  // Scroll to top on page change
  useEffect(() => {
    if (!mainRef.current) return;
    mainRef.current.scrollTop = 0;
  }, [currentPage]);

  // RENDER

  if (!fileUrl) {
    return (
      <div className="prep-pdf-error">{t(dict, "resources_pdf_no_file")}</div>
    );
  }

  if (error) {
    return (
      <div className="prep-pdf-error">
        <span className="prep-pdf-error__icon">⚠️</span>
        <span className="prep-pdf-error__text">{error}</span>
        <button
          className="prep-pdf-error__retry"
          onClick={() => window.location.reload()}
        >
          {t(dict, "resources_pdf_error_retry")}
        </button>
      </div>
    );
  }

  // Show internal nav only if not hidden AND not using external nav
  const showInternalNav = !hideControls && !externalNav && numPages > 0;

  return (
    <div className="prep-pdf-layout">
      {/* MAIN AREA */}
      <div className="prep-pdf-main">
        <div className="prep-pdf-main-inner" ref={mainRef}>
          {loading && !pdfDoc && (
            <div className="cpv-loading">
              <div className="cpv-loading__spinner" />
              <span>{t(dict, "resources_pdf_loading")}</span>
            </div>
          )}

          {/* Canvas + overlay */}
          <div
            className="cpv-page-wrapper"
            ref={pageWrapperRef}
            style={{ position: "relative", display: "inline-block" }}
          >
            <canvas
              ref={pdfCanvasRef}
              className="prep-pdf-canvas cpv-page-canvas"
            />

            {/* Annotation / pointer overlay (PrepShell children) */}
            {children && (
              <div
                className="prep-pdf-overlay"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: "auto",
                }}
              >
                {children}
              </div>
            )}
          </div>
        </div>

        {/* INTERNAL NAV - only shown if not using external nav */}
        {showInternalNav && (
          <div className="cpv-nav">
            <div className="cpv-nav__left">
              <button
                type="button"
                className="cpv-nav__btn"
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM}
                title={t(dict, "resources_pdf_zoom_out")}
              >
                −
              </button>
              <div
                className="cpv-nav__zoom"
                onClick={zoomFit}
                style={{ cursor: "pointer" }}
                title={t(dict, "resources_pdf_zoom_reset")}
              >
                {Math.round(zoom * 100)}%
              </div>
              <button
                type="button"
                className="cpv-nav__btn"
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM}
                title={t(dict, "resources_pdf_zoom_in")}
              >
                +
              </button>
              {/* NEW: Fit to page button with icon */}
              <button
                type="button"
                className="cpv-nav__btn"
                onClick={() => {
                  fitToPage();
                  onFitToPage?.();
                }}
                title={t(dict, "resources_pdf_fit_to_page")}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="5"
                    y="4"
                    width="14"
                    height="16"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 1V3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 21V23"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 1L12 3L14 1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 23L12 21L14 23"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="cpv-nav__center">
              <button
                type="button"
                className="cpv-nav__btn"
                onClick={goPrevPage}
                disabled={!canGoPrev}
                title={t(dict, "resources_pdf_prev_page")}
              >
                ←
              </button>
              <div className="cpv-nav__pages">
                {t(dict, "resources_pdf_page_label", {
                  current: currentPage,
                  total: numPages || "…",
                })}
              </div>
              <button
                type="button"
                className="cpv-nav__btn"
                onClick={goNextPage}
                disabled={!canGoNext}
                title={t(dict, "resources_pdf_next_page")}
              >
                →
              </button>
            </div>

            <div className="cpv-nav__right">{/* future controls */}</div>
          </div>
        )}
      </div>

      {/* SIDEBAR */}
      {!hideSidebar && numPages > 1 && (
        <aside className="prep-pdf-sidebar">
          {numPages === 0 ? (
            <div className="prep-pdf-sidebar__empty">
              {t(dict, "resources_pdf_sidebar_empty")}
            </div>
          ) : (
            <div className="prep-pdf-sidebar__pages">
              {Array.from({ length: numPages }, (_, i) => i + 1).map(
                (pageNo) => (
                  <button
                    key={pageNo}
                    type="button"
                    className={
                      "prep-pdf-sidebar__page-button" +
                      (pageNo === currentPage ? " is-active" : "")
                    }
                    onClick={() => setCurrentPage(pageNo)}
                  >
                    {pageNo}
                  </button>
                )
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXPORTED: PdfNavBar component for external use
// ─────────────────────────────────────────────────────────────
export function PdfNavBar({ navState, locale = "en", className = "" }) {
  const dict = getDictionary(locale, "resources");

  if (!navState || navState.numPages === 0) return null;

  const {
    currentPage,
    numPages,
    zoom,
    canGoPrev,
    canGoNext,
    goPrevPage,
    goNextPage,
    zoomIn,
    zoomOut,
    zoomFit,
    fitToPage, // NEW
  } = navState;

  return (
    <div className={`cpv-nav cpv-nav--external ${className}`}>
      <div className="cpv-nav__left">
        <button
          type="button"
          className="cpv-nav__btn"
          onClick={zoomOut}
          disabled={zoom <= 0.5}
          title={t(dict, "resources_pdf_zoom_out")}
        >
          −
        </button>
        <div
          className="cpv-nav__zoom"
          onClick={zoomFit}
          style={{ cursor: "pointer" }}
          title={t(dict, "resources_pdf_zoom_reset")}
        >
          {Math.round(zoom * 100)}%
        </div>
        <button
          type="button"
          className="cpv-nav__btn"
          onClick={zoomIn}
          disabled={zoom >= 3.0}
          title={t(dict, "resources_pdf_zoom_in")}
        >
          +
        </button>
        {/* NEW: Fit to page button with icon */}
        <button
          type="button"
          className="cpv-nav__btn"
          onClick={fitToPage}
          title={t(dict, "resources_pdf_fit_to_page")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="5"
              y="4"
              width="14"
              height="16"
              rx="1"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 1V3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M12 21V23"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M10 1L12 3L14 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10 23L12 21L14 23"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="cpv-nav__center">
        <button
          type="button"
          className="cpv-nav__btn"
          onClick={goPrevPage}
          disabled={!canGoPrev}
          title={t(dict, "resources_pdf_prev_page")}
        >
          ←
        </button>
        <div className="cpv-nav__pages">
          {t(dict, "resources_pdf_page_label", {
            current: currentPage,
            total: numPages || "…",
          })}
        </div>
        <button
          type="button"
          className="cpv-nav__btn"
          onClick={goNextPage}
          disabled={!canGoNext}
          title={t(dict, "resources_pdf_next_page")}
        >
          →
        </button>
      </div>

      <div className="cpv-nav__right">{/* future controls */}</div>
    </div>
  );
}
