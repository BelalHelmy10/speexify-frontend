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
 * PdfViewerWithSidebar - PDF viewer with annotation support
 *
 * CRITICAL: Annotations must be rendered as children of this component
 * so they scroll with the PDF content.
 *
 * Props:
 *  - fileUrl: URL of the PDF file
 *  - onFatalError: callback when PDF fails to load
 *  - onPageChange(pageNum, numPages): called when page changes
 *  - onCanvasSizeChange({ width, height }): called when PDF canvas resizes
 *  - renderAnnotations({ width, height }): render prop for annotation overlay
 */
const PdfViewerWithSidebar = forwardRef(function PdfViewerWithSidebar(
  {
    fileUrl,
    onFatalError,
    onPageChange,
    onCanvasSizeChange,
    renderAnnotations,
  },
  ref
) {
  const scrollContainerRef = useRef(null);
  const pdfCanvasRef = useRef(null);

  const [pdfjs, setPdfjs] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState(null);

  // Expose to parent
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

  // Notify parent of page changes
  useEffect(() => {
    if (onPageChange && numPages > 0) {
      onPageChange(currentPage, numPages);
    }
  }, [currentPage, numPages, onPageChange]);

  // Notify parent of canvas size changes
  useEffect(() => {
    if (onCanvasSizeChange && canvasSize.width > 0) {
      onCanvasSizeChange(canvasSize);
    }
  }, [canvasSize, onCanvasSizeChange]);

  // Load PDF.js and document
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

  // Render PDF page
  const renderPage = useCallback(async () => {
    if (
      !pdfjs ||
      !pdfDoc ||
      !pdfCanvasRef.current ||
      !scrollContainerRef.current
    ) {
      return;
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const containerRect = scrollContainerRef.current.getBoundingClientRect();

      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = containerRect.width / unscaledViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = pdfCanvasRef.current;
      const ctx = canvas.getContext("2d");

      // Set canvas resolution
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Update size state BEFORE render
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
      if (!cancelled) await renderPage();
    };
    doRender();

    let observer;
    if (typeof ResizeObserver !== "undefined" && scrollContainerRef.current) {
      observer = new ResizeObserver(() => {
        if (!cancelled) renderPage();
      });
      observer.observe(scrollContainerRef.current);
    }

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
    };
  }, [renderPage]);

  function handlePageClick(pageNum) {
    setCurrentPage(pageNum);
  }

  // ─────────────────────────────────────────────────────────────
  // INLINE STYLES - to prevent any CSS conflicts
  // ─────────────────────────────────────────────────────────────
  const layoutStyle = {
    display: "flex",
    width: "100%",
    height: "100%",
    minHeight: "400px",
  };

  const scrollContainerStyle = {
    flex: 1,
    overflow: "auto", // THIS IS THE SCROLLABLE CONTAINER
    position: "relative", // For any absolutely positioned children
    backgroundColor: "#1f2937",
  };

  // This wrapper contains BOTH the PDF canvas AND annotations
  // It's sized to match the PDF canvas exactly
  const contentWrapperStyle = {
    position: "relative", // CRITICAL: annotations position relative to this
    width: canvasSize.width > 0 ? `${canvasSize.width}px` : "100%",
    height: canvasSize.height > 0 ? `${canvasSize.height}px` : "auto",
    margin: "0 auto", // Center if narrower than container
  };

  const canvasStyle = {
    display: "block", // Remove any inline spacing
    width: canvasSize.width > 0 ? `${canvasSize.width}px` : "100%",
    height: canvasSize.height > 0 ? `${canvasSize.height}px` : "auto",
  };

  // Annotation layer - positioned absolutely to cover the PDF exactly
  const annotationLayerStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: canvasSize.width > 0 ? `${canvasSize.width}px` : "100%",
    height: canvasSize.height > 0 ? `${canvasSize.height}px` : "100%",
    pointerEvents: "none", // Let clicks pass through by default
    zIndex: 10,
  };

  const sidebarStyle = {
    width: "60px",
    backgroundColor: "#111827",
    borderLeft: "1px solid #374151",
    overflowY: "auto",
    padding: "8px 4px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };

  const pageButtonStyle = (isActive) => ({
    width: "100%",
    padding: "8px 4px",
    border: "none",
    borderRadius: "4px",
    backgroundColor: isActive ? "#3b82f6" : "#374151",
    color: isActive ? "#fff" : "#9ca3af",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: isActive ? "600" : "400",
  });

  const errorStyle = {
    padding: "20px",
    color: "#ef4444",
    textAlign: "center",
  };

  const loadingStyle = {
    padding: "20px",
    color: "#9ca3af",
    textAlign: "center",
  };

  return (
    <div style={layoutStyle} className="prep-pdf-layout">
      {/* SCROLLABLE CONTAINER */}
      <div
        ref={scrollContainerRef}
        style={scrollContainerStyle}
        className="prep-pdf-main"
      >
        {/* 
          CONTENT WRAPPER - Contains both PDF canvas and annotation layer
          This div is sized to match the PDF canvas.
          When user scrolls, BOTH the canvas and annotations move together.
        */}
        <div style={contentWrapperStyle}>
          {error ? (
            <div style={errorStyle}>{error}</div>
          ) : (
            <>
              {/* PDF CANVAS */}
              <canvas
                ref={pdfCanvasRef}
                style={canvasStyle}
                className="prep-pdf-canvas"
              />

              {/* ANNOTATION LAYER - absolutely positioned, scrolls with PDF */}
              {renderAnnotations &&
                canvasSize.width > 0 &&
                canvasSize.height > 0 && (
                  <div style={annotationLayerStyle}>
                    {renderAnnotations({
                      width: canvasSize.width,
                      height: canvasSize.height,
                    })}
                  </div>
                )}
            </>
          )}
        </div>
      </div>

      {/* PAGE SIDEBAR */}
      <aside style={sidebarStyle} className="prep-pdf-sidebar">
        {error ? (
          <div style={errorStyle}>Error</div>
        ) : numPages === 0 ? (
          <div style={loadingStyle}>...</div>
        ) : (
          Array.from({ length: numPages }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                type="button"
                style={pageButtonStyle(pageNum === currentPage)}
                onClick={() => handlePageClick(pageNum)}
                className={
                  "prep-pdf-sidebar__page-button" +
                  (pageNum === currentPage ? " is-active" : "")
                }
              >
                {pageNum}
              </button>
            );
          })
        )}
      </aside>
    </div>
  );
});

export default PdfViewerWithSidebar;
