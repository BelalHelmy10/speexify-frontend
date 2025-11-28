// app/resources/prep/PdfViewerWithSidebar.jsx
"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

/**
 * PdfViewerWithSidebar
 *
 * Props:
 *  - fileUrl: URL of the PDF file
 *  - onFatalError: callback when PDF fails to load
 *  - onPageChange: callback(pageNum, numPages) when page changes
 *  - onCanvasSizeChange: callback({ width, height }) when PDF canvas resizes
 *  - children: annotation overlay elements (rendered inside scroll container)
 *
 * Ref exposes:
 *  - currentPage: number
 *  - numPages: number
 *  - canvasSize: { width, height }
 *  - getInnerContainer(): HTMLElement - the scrollable inner container
 */
const PdfViewerWithSidebar = forwardRef(function PdfViewerWithSidebar(
  { fileUrl, onFatalError, onPageChange, onCanvasSizeChange, children },
  ref
) {
  const mainRef = useRef(null);
  const innerRef = useRef(null);
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
      getInnerContainer: () => innerRef.current,
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

  // Notify parent when canvas size changes
  useEffect(() => {
    if (onCanvasSizeChange && canvasSize.width > 0) {
      onCanvasSizeChange(canvasSize);
    }
  }, [canvasSize, onCanvasSizeChange]);

  // Load pdf.js + the PDF document
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!fileUrl) return;

      setError(null);
      setNumPages(0);
      setPdfDoc(null);
      setCurrentPage(1);

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

  // Render current page (and re-render on resize)
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

      // Update canvas size state for parent
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
      <div className="prep-pdf-main" ref={mainRef}>
        {/* 
          IMPORTANT: This inner div has position:relative so annotations 
          are positioned relative to the PDF content, not the viewport.
          When the user scrolls, annotations move with the PDF.
        */}
        <div
          className="prep-pdf-main-inner"
          ref={innerRef}
          style={{
            position: "relative",
            // Make inner container match PDF canvas size so annotations
            // positioned at bottom of page work correctly
            minWidth:
              canvasSize.width > 0 ? `${canvasSize.width}px` : undefined,
            minHeight:
              canvasSize.height > 0 ? `${canvasSize.height}px` : undefined,
          }}
        >
          {error ? (
            <div className="prep-pdf-error">{error}</div>
          ) : (
            <>
              <canvas ref={pdfCanvasRef} className="prep-pdf-canvas" />
              {/* 
                Children (annotations) are rendered HERE, inside the scrollable
                container, so they scroll with the PDF content 
              */}
              {children}
            </>
          )}
        </div>
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
});

export default PdfViewerWithSidebar;
