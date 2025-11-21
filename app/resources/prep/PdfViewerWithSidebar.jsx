// app/resources/prep/PdfViewerWithSidebar.jsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function PdfViewerWithSidebar({
  fileUrl,
  containerRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  children, // annotation overlay from PrepShell
}) {
  const pdfCanvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Load pdf.js + document
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist/build/pdf");
        const worker = await import("pdfjs-dist/build/pdf.worker.entry");

        // configure worker
        pdfjs.GlobalWorkerOptions.workerSrc = worker;

        if (cancelled) return;

        const loadingTask = pdfjs.getDocument(fileUrl);
        const doc = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages || 0);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to load PDF", err);
      }
    }

    if (fileUrl) load();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // Render current page and rerender on resize
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current || !containerRef?.current) return;

    let cancelled = false;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const container = containerRef.current;
        const rect = container.getBoundingClientRect();

        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = rect.width / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = pdfCanvasRef.current;
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        if (!cancelled) console.error("Failed to render PDF page", err);
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
  }, [pdfDoc, currentPage, containerRef]);

  const handlePageClick = (pageNum) => {
    setCurrentPage(pageNum);
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
        <canvas ref={pdfCanvasRef} className="prep-pdf-canvas" />
        {/* Annotation overlay from PrepShell */}
        {children}
      </div>

      <aside className="prep-pdf-sidebar">
        {numPages === 0 ? (
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
