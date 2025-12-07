// app/resources/prep/PdfViewerWithSidebar.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function PdfViewerWithSidebar({
  fileUrl,
  onFatalError,
  children, // overlay from PrepShell will be rendered over the page
  onContainerReady, // optional callback to expose the scroll container
  hideControls = false, // hide bottom nav if desired
  hideSidebar = false, // hide page list if desired
}) {
  const mainRef = useRef(null); // scroll container
  const pdfCanvasRef = useRef(null); // main PDF canvas
  const pageWrapperRef = useRef(null); // wrapper for positioning overlay

  const [pdfjs, setPdfjs] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track current render task so we can cancel when switching page/zoom
  const renderTaskRef = useRef(null);

  // Expose the page wrapper (not scroll container) to parent for annotation positioning
  const updateContainerRef = useCallback(() => {
    if (typeof onContainerReady === "function" && pageWrapperRef.current) {
      onContainerReady(pageWrapperRef.current);
    }
  }, [onContainerReady]);

  useEffect(() => {
    updateContainerRef();
  }, [updateContainerRef]);

  // Load pdf.js lazily on the client
  useEffect(() => {
    let cancelled = false;

    async function loadPdfJs() {
      try {
        const pdfjsLib = await import("pdfjs-dist/build/pdf");

        // Try to set up the worker
        try {
          // Option 1: Use CDN worker (most reliable)
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        } catch (workerErr) {
          console.warn(
            "Failed to set PDF.js worker, using main thread:",
            workerErr
          );
          // Will fall back to main thread rendering
        }

        if (!cancelled) {
          setPdfjs(pdfjsLib);
        }
      } catch (err) {
        console.error("Failed to load pdf.js", err);
        if (!cancelled) {
          setError("Failed to load PDF engine.");
          setLoading(false);
          onFatalError?.(err);
        }
      }
    }

    loadPdfJs();

    return () => {
      cancelled = true;
    };
  }, [onFatalError]);

  // Load the PDF document whenever fileUrl or pdfjs changes
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
        // Configure loading options for better compatibility
        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          // Disable range requests which can cause issues with some servers
          disableRange: true,
          // Disable streaming for better compatibility
          disableStream: true,
          // Allow credentials for authenticated requests
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
          let msg = "Failed to load PDF file.";

          // Provide more specific error messages
          if (err.message?.includes("Missing PDF")) {
            msg = "The PDF file could not be found or is not accessible.";
          } else if (err.message?.includes("Invalid PDF")) {
            msg = "This file does not appear to be a valid PDF.";
          } else if (err.name === "MissingPDFException") {
            msg = "The PDF file is missing or the URL is incorrect.";
          } else if (
            err.message?.includes("fetch") ||
            err.message?.includes("network")
          ) {
            msg =
              "Network error: Could not download the PDF. The file may be private or require authentication.";
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
  }, [pdfjs, fileUrl, onFatalError]);

  // Render the current page whenever pdfDoc, currentPage, or zoom changes
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
        if (cancelled) {
          return;
        }

        const canvas = pdfCanvasRef.current;
        const context = canvas.getContext("2d");

        const devicePixelRatio = window.devicePixelRatio || 1;

        const viewport = page.getViewport({ scale: zoom });
        const outputScale = devicePixelRatio;

        canvas.width = viewport.width * outputScale;
        canvas.height = viewport.height * outputScale;

        // CSS size (so overlay & coordinates match visual size)
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
          // Update container ref after render to ensure correct sizing
          updateContainerRef();
        }
      } catch (err) {
        if (cancelled) return;
        // Ignore cancelled render errors
        if (err.name === "RenderingCancelledException") return;

        console.error("Failed to render PDF page:", err);
        setError("Failed to render PDF page.");
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
  }, [pdfDoc, currentPage, zoom, updateContainerRef]);

  // Cleanup pdfDoc on unmount
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        try {
          pdfDoc.destroy();
        } catch (_) {}
      }
    };
  }, [pdfDoc]);

  // ─────────────────────────────────────────────────────────────
  // Controls: page navigation & zoom
  // ─────────────────────────────────────────────────────────────

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

  // When currentPage changes, scroll to top of viewer
  useEffect(() => {
    if (!mainRef.current) return;
    mainRef.current.scrollTop = 0;
  }, [currentPage]);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  if (!fileUrl) {
    return (
      <div className="prep-pdf-error">
        No PDF file was provided for this resource.
      </div>
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
          Retry
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
              <span>Loading PDF…</span>
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
            {/* Overlay from PrepShell (annotations, pointer, etc.) */}
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

          {/* Bottom nav (zoom + page) – can be hidden with hideControls */}
          {!hideControls && numPages > 0 && (
            <div className="cpv-nav">
              <div className="cpv-nav__left">
                <button
                  type="button"
                  className="cpv-nav__btn"
                  onClick={zoomOut}
                  disabled={zoom <= MIN_ZOOM}
                  title="Zoom out"
                >
                  −
                </button>
                <div
                  className="cpv-nav__zoom"
                  onClick={zoomFit}
                  style={{ cursor: "pointer" }}
                  title="Reset zoom"
                >
                  {Math.round(zoom * 100)}%
                </div>
                <button
                  type="button"
                  className="cpv-nav__btn"
                  onClick={zoomIn}
                  disabled={zoom >= MAX_ZOOM}
                  title="Zoom in"
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
                  title="Previous page"
                >
                  ←
                </button>
                <div className="cpv-nav__pages">
                  Page {currentPage} / {numPages || "…"}
                </div>
                <button
                  type="button"
                  className="cpv-nav__btn"
                  onClick={goNextPage}
                  disabled={!canGoNext}
                  title="Next page"
                >
                  →
                </button>
              </div>

              <div className="cpv-nav__right">
                {/* Reserved for future: "Fit to width", etc. */}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SIDEBAR (page buttons) – can be hidden with hideSidebar */}
      {!hideSidebar && numPages > 1 && (
        <aside className="prep-pdf-sidebar">
          {numPages === 0 ? (
            <div className="prep-pdf-sidebar__empty">
              No pages detected in this PDF.
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
