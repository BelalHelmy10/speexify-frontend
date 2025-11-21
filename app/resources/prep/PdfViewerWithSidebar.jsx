// app/resources/prep/PdfViewerWithSidebar.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs";

// Tell pdf.js where the worker lives (ESM-friendly)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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
  const [error, setError] = useState(null);

  // Load the PDF document
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!fileUrl) return;

      setError(null);
      setNumPages(0);
      setPdfDoc(null);

      try {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        const doc = await loadingTask.promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages || 0);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to load PDF", err);
        if (!cancelled) {
          setError("Couldn’t load PDF file.");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // Render current page (and on resize)
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
        if (!cancelled) {
          console.error("Failed to render PDF page", err);
          setError("Couldn’t render this page.");
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
        {/* Annotation overlay from PrepShell (canvas + notes + text + pointer) */}
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
