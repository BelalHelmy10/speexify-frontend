// app/resources/prep/PdfViewerWithSidebar.jsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function PdfViewerWithSidebar({
  fileUrl,
  onFatalError,
  children, // overlay from PrepShell will be rendered here
  onContainerReady, // optional callback to expose the scroll container
  hideControls = false,
  hideSidebar = false,
}) {
  const mainRef = useRef(null);
  const pdfCanvasRef = useRef(null);

  const [pdfjs, setPdfjs] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);

  // Expose the scroll container to the parent (PrepShell) once mounted
  useEffect(() => {
    if (typeof onContainerReady === "function" && mainRef.current) {
      const inner = mainRef.current.querySelector(".prep-pdf-main-inner");
      if (inner) {
        onContainerReady(inner);
      }
    }
  }, [onContainerReady]);

  // Load pdf.js + the PDF document
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!fileUrl) {
        setPdfDoc(null);
        setNumPages(0);
        setError("No PDF file URL provided.");
        return;
      }

      setError(null);
      setNumPages(0);
      setPdfDoc(null);

      try {
        // ✅ Use the legacy build so Webpack/Next doesn't pull in pdf.mjs
        const rawModule = await import("pdfjs-dist/legacy/build/pdf");
        const pdfjsModule = rawModule.default ?? rawModule;

        // ✅ Configure worker – using CDN is fine
        pdfjsModule.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsModule.version}/pdf.worker.min.js`;

        if (cancelled) return;
        setPdfjs(pdfjsModule);

        const loadingTask = pdfjsModule.getDocument(fileUrl);
        const doc = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages || 0);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to load PDF", err);
        if (!cancelled) {
          setError("Couldn't load PDF file.");
          if (onFatalError) onFatalError(err);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, onFatalError]);

  // Render current page (and re-render on resize)
  useEffect(() => {
    if (!pdfjs || !pdfDoc || !pdfCanvasRef.current || !mainRef.current) {
      return;
    }

    let cancelled = false;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const container = mainRef.current;
        const rect = container.getBoundingClientRect();

        // Skip if container has no size yet
        if (rect.width === 0 || rect.height === 0) return;

        const unscaledViewport = page.getViewport({ scale: 1 });

        // Calculate scale to fit width with some padding
        const scaleWidth =
          rect.width > 0 ? (rect.width * 0.95) / unscaledViewport.width : 1;

        // In classroom mode, fit to width; allow vertical scrolling
        const scale = scaleWidth;

        const viewport = page.getViewport({ scale });

        const canvas = pdfCanvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to render PDF page", err);
          setError("Couldn't render this page.");
          if (onFatalError) onFatalError(err);
        }
      }
    }

    renderPage();

    let observer;
    if (typeof ResizeObserver !== "undefined" && mainRef.current) {
      observer = new ResizeObserver(() => {
        renderPage();
      });
      observer.observe(mainRef.current);
    }

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
    };
  }, [pdfjs, pdfDoc, currentPage, onFatalError, hideControls]);

  function handlePageClick(pageNum) {
    setCurrentPage(pageNum);
  }

  return (
    <div className="prep-pdf-layout">
      <div className="prep-pdf-main" ref={mainRef}>
        <div className="prep-pdf-main-inner" style={{ position: "relative" }}>
          {error ? (
            <div className="prep-pdf-error">{error}</div>
          ) : (
            <>
              <canvas ref={pdfCanvasRef} className="prep-pdf-canvas" />
              {children}

              {/* Navigation arrows for classroom mode */}
              {hideControls && numPages > 1 && (
                <div className="prep-pdf-nav">
                  <button
                    type="button"
                    className="prep-pdf-nav__btn prep-pdf-nav__btn--prev"
                    onClick={() =>
                      handlePageClick(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    ←
                  </button>
                  <span className="prep-pdf-nav__indicator">
                    {currentPage} / {numPages}
                  </span>
                  <button
                    type="button"
                    className="prep-pdf-nav__btn prep-pdf-nav__btn--next"
                    onClick={() =>
                      handlePageClick(Math.min(numPages, currentPage + 1))
                    }
                    disabled={currentPage === numPages}
                    aria-label="Next page"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!hideSidebar && (
        <aside className="prep-pdf-sidebar">
          {error ? (
            <div className="prep-pdf-sidebar__empty">{error}</div>
          ) : numPages === 0 ? (
            <div className="prep-pdf-sidebar__empty">Loading pages…</div>
          ) : (
            <div className="prep-pdf-sidebar__pages">
              {Array.from({ length: numPages }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={
                      "prep-pdf-sidebar__page-button" +
                      (pageNum === currentPage ? " is-active" : "")
                    }
                    onClick={() => handlePageClick(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
