// app/resources/prep/PdfViewerWithSidebar.jsx
"use client";

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";

/**
 * PdfViewerWithSidebar
 *
 * This component renders a PDF with a page sidebar. The annotation overlay
 * is passed as a render prop so it can access the PDF canvas dimensions
 * and be properly positioned inside the scrollable container.
 *
 * Props:
 *  - fileUrl: URL of the PDF file
 *  - onFatalError: callback when PDF fails to load
 *  - onPageChange: callback(pageNum, numPages) when page changes
 *  - renderOverlay: function({ canvasWidth, canvasHeight }) => ReactNode
 *                   Returns the annotation overlay to render inside the scroll container.
 *
 * Ref exposes:
 *  - currentPage: number
 *  - numPages: number
 *  - canvasSize: { width, height }
 *  - goToPage(pageNum): navigate to a specific page
 */
const PdfViewerWithSidebar = forwardRef(function PdfViewerWithSidebar(
  { fileUrl, onFatalError, onPageChange, renderOverlay },
  ref
) {
  const mainRef = useRef(null);
  const pdfCanvasRef = useRef(null);

  const [pdfjs, setPdfjs] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState(null);

  // Expose state and methods to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      currentPage,
      numPages,
      canvasSize,
      goToPage: (pageNum) => {
        if (pageNum >= 1 && pageNum <= numPages) {
          setCurrentPage(pageNum);
        }
      },
    }),
    [currentPage, numPages, canvasSize]
  );

  // Notify parent when page changes
  useEffect(() => {
    if (onPageChange && numPages > 0) {
      onPageChange(currentPage, numPages);
    }
  }, [currentPage, numPages, onPageChange]);

  // Load pdf.js + the PDF document
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!fileUrl) return;

      setError(null);
      setNumPages(0);
      setPdfDoc(null);
      setCurrentPage(1);
      setCanvasSize({ width: 0, height: 0 });

      try {
        const pdfjsModule = await import("pdfjs-dist/build/pdf");

        // pdf.js worker from CDN
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

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfjs || !pdfDoc || !pdfCanvasRef.current || !mainRef.current) {
      return;
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const container = mainRef.current;
      const rect = container.getBoundingClientRect();

      const unscaledViewport = page.getViewport({ scale: 1 });

      // Fit width; height can overflow, container can scroll
      const scale = rect.width / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = pdfCanvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // Update canvas size for overlay
      setCanvasSize({ width: viewport.width, height: viewport.height });

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error("Failed to render PDF page", err);
      setError("Couldn't render this page.");
      if (onFatalError) onFatalError(err);
    }
  }, [pdfjs, pdfDoc, currentPage, onFatalError]);

  useEffect(() => {
    let cancelled = false;

    const doRender = async () => {
      if (!cancelled) {
        await renderPage();
      }
    };

    doRender();

    let observer;
    if (typeof ResizeObserver !== "undefined" && mainRef.current) {
      observer = new ResizeObserver(() => {
        if (!cancelled) {
          renderPage();
        }
      });
      observer.observe(mainRef.current);
    }

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
    };
  }, [renderPage]);

  function handlePageClick(pageNum) {
    setCurrentPage(pageNum);
  }

  return (
    <div className="prep-pdf-layout">
      {/* 
        This is the SCROLLABLE container (.prep-pdf-main has overflow: auto/scroll).
        The inner wrapper has position:relative so annotations position correctly.
        When user scrolls, both the PDF canvas and annotations move together.
      */}
      <div className="prep-pdf-main" ref={mainRef}>
        {/* 
          CRITICAL: This wrapper is position:relative and sized to match the PDF.
          Annotations are absolutely positioned inside this wrapper.
        */}
        <div
          className="prep-pdf-content-wrapper"
          style={{
            position: "relative",
            width: canvasSize.width > 0 ? canvasSize.width : "100%",
            height: canvasSize.height > 0 ? canvasSize.height : "auto",
          }}
        >
          {error ? (
            <div className="prep-pdf-error">{error}</div>
          ) : (
            <>
              {/* PDF Canvas - the actual rendered PDF page */}
              <canvas
                ref={pdfCanvasRef}
                className="prep-pdf-canvas"
                style={{
                  display: "block",
                }}
              />

              {/* 
                Annotation Overlay Container
                - Absolutely positioned to cover the PDF canvas exactly
                - Scrolls WITH the PDF because it's inside the same relative container
              */}
              {renderOverlay &&
                canvasSize.width > 0 &&
                canvasSize.height > 0 && (
                  <div
                    className="prep-pdf-annotation-container"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: canvasSize.width,
                      height: canvasSize.height,
                      pointerEvents: "none", // Let events pass through by default
                      zIndex: 10,
                    }}
                  >
                    {renderOverlay({
                      canvasWidth: canvasSize.width,
                      canvasHeight: canvasSize.height,
                    })}
                  </div>
                )}
            </>
          )}
        </div>
      </div>

      {/* Page sidebar */}
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
});

export default PdfViewerWithSidebar;
