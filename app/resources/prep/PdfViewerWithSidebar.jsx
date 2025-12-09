// app/resources/prep/PdfViewerWithSidebar.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getDictionary, t } from "@/app/i18n";

export default function PdfViewerWithSidebar({
  fileUrl,
  onFatalError,
  children, // overlay from PrepShell will be rendered over the page
  onContainerReady, // exposes the page wrapper (annotation container) to parent
  hideControls = false,
  hideSidebar = false,
  locale = "en",
}) {
  const mainRef = useRef(null); // scroll container
  const pdfCanvasRef = useRef(null); // main PDF canvas
  const pageWrapperRef = useRef(null); // wrapper that matches the PDF page (used for annotations)

  const [pdfjs, setPdfjs] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const dict = getDictionary(locale, "resources");

  const renderTaskRef = useRef(null);

  // Expose the page wrapper element to parent (for normalized coords)
  const updateContainerRef = useCallback(() => {
    if (typeof onContainerReady === "function" && pageWrapperRef.current) {
      onContainerReady(pageWrapperRef.current);
    }
  }, [onContainerReady]);

  useEffect(() => {
    updateContainerRef();
  }, [updateContainerRef]);

  // Load pdf.js lazily
  useEffect(() => {
    let cancelled = false;

    async function loadPdfJs() {
      try {
        const pdfjsLib = await import("pdfjs-dist/build/pdf");

        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        } catch (workerErr) {
          console.warn(
            "Failed to set PDF.js worker, using main thread:",
            workerErr
          );
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
  }, [onFatalError, dict]);

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
  }, [pdfjs, fileUrl, onFatalError, dict]);

  // Render the current page
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;

    let cancelled = false;

    async function renderPage() {
      setLoading(true);
      setError(null);

      // Cancel any previous render
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

        // Pixel size of the canvas backing store
        canvas.width = viewport.width * outputScale;
        canvas.height = viewport.height * outputScale;

        // CSS size (visual size) – overlay & normalized coords match this
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        // Scale drawing for high-DPI displays
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
          // Ensure parent gets the up-to-date container size
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

  // Controls
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < numPages;

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3.0;
  const ZOOM_STEP = 0.25;

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

          {/* Bottom nav */}
          {!hideControls && numPages > 0 && (
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
