// app/resources/prep/PdfViewerWithSidebar.jsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function PdfViewerWithSidebar({
  fileUrl,
  containerRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  children, // overlay (annotation canvas + notes/text/pointer)
  onFatalError,
  currentPage,
  onChangePage,
}) {
  const pdfCanvasRef = useRef(null);

  const [pdfjs, setPdfjs] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(null);

  // Load pdf.js + PDF document
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!fileUrl) return;

      setError(null);
      setPdfDoc(null);
      setNumPages(0);

      try {
        const pdfjsModule = await import("pdfjs-dist/build/pdf");

        // pdf.js worker – must be a URL string
        pdfjsModule.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsModule.version}/pdf.worker.min.js`;

        if (cancelled) return;
        setPdfjs(pdfjsModule);

        const loadingTask = pdfjsModule.getDocument(fileUrl);
        const doc = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages || 0);

        // Reset to page 1 on new file
        if (onChangePage) {
          onChangePage(1);
        }
      } catch (err) {
        console.error("Failed to load PDF", err);
        if (!cancelled) {
          setError("Couldn’t load PDF file.");
          if (onFatalError) onFatalError(err);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, onChangePage, onFatalError]);

  // Render the current page (and re-render on resize)
  useEffect(() => {
    if (!pdfjs || !pdfDoc || !pdfCanvasRef.current || !containerRef?.current) {
      return;
    }

    let cancelled = false;

    async function renderPage() {
      try {
        const pageNumber = currentPage || 1;
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;

        const containerEl = containerRef.current;
        const rect = containerEl.getBoundingClientRect();

        // Fit page width to container width
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = rect.width / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = pdfCanvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to render PDF page", err);
          setError("Couldn’t render this page.");
          if (onFatalError) onFatalError(err);
        }
      }
    }

    renderPage();

    let observer;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      observer = new ResizeObserver(() => {
        renderPage();
      });
      observer.observe(containerRef.current);
    }

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
    };
  }, [pdfjs, pdfDoc, currentPage, containerRef, onFatalError]);

  const handlePageClick = (pageNum) => {
    if (onChangePage) onChangePage(pageNum);
  };

  return (
    <div className="prep-pdf-layout">
      <div
        className="prep-viewer__canvas-container"
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* PDF base canvas */}
        <canvas ref={pdfCanvasRef} className="prep-pdf-canvas" />

        {/* Annotation overlay (canvas + notes + text + pointer) */}
        {children}
      </div>

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
    </div>
  );
}
