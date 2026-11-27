// app/resources/prep/PdfViewerWithSidebar.jsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getDictionary, t } from "@/app/i18n";
import { COMPACT_CLASSROOM_QUERY, normalizePdfRegion, visiblePdfRegion, regionFitZoom } from './pdfViewport.mjs';
import { useClassroomText } from "@/app/classroom/[sessionId]/classroomText";

function PdfPageIndicator({ dict, currentPage, numPages }) {
  const pageTotalLabel = numPages || "…";
  const pageAriaLabel = t(dict, "resources_pdf_page_label", {
    current: currentPage,
    total: pageTotalLabel,
  });

  return (
    <div
      className="cpv-nav__pages"
      aria-label={pageAriaLabel}
      aria-live="polite"
    >
      <span className="cpv-nav__pages-kicker">
        {t(dict, "resources_pdf_page_short")}
      </span>
      <span className="cpv-nav__pages-current">{currentPage}</span>
      <span className="cpv-nav__pages-divider">/</span>
      <span className="cpv-nav__pages-total">{pageTotalLabel}</span>
    </div>
  );
}

function PdfZoomSlider({ zoom, onChange, min = 0.1, max = 5 }) {
  const ct = useClassroomText();
  return (
    <input
      className="cpv-nav__zoom-slider"
      type="range"
      min={Math.round(min * 100)}
      max={Math.round(max * 100)}
      step="1"
      value={Math.min(max * 100, Math.max(min * 100, Math.round(zoom * 100)))}
      onChange={(event) => onChange(Number(event.target.value))}
      aria-label={ct("cr_pdf_zoom")}
      title={ct("cr_pdf_zoom_hint")}
    />
  );
}

// Large canvases exhaust memory (iOS Safari refuses canvases above ~16.7 MP
// and a page at 5x zoom on a Retina screen is ~48 MP). Cap the backing store
// and let the browser upscale slightly instead.
const MAX_CANVAS_PIXELS = 12_000_000;

function getCanvasOutputScale(cssWidth, cssHeight) {
  const devicePixelRatio = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  const area = Math.max(1, cssWidth * cssHeight);
  return Math.max(0.25, Math.min(devicePixelRatio, Math.sqrt(MAX_CANVAS_PIXELS / area)));
}

export default function PdfViewerWithSidebar({
  fileUrl,
  fitMode = "width",
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
  onViewportChange,
}) {
  const mainRef = useRef(null);
  const [scrollElement, setScrollElement] = useState(null);
  const attachScrollContainer = useCallback((node) => {
    mainRef.current = node;
    setScrollElement(node);
  }, []);
  const pdfCanvasRef = useRef(null);
  const pageWrapperRef = useRef(null);

  // ✅ Auto-fit helpers
  // We auto-fit when:
  // - a PDF is first loaded
  // - the container resizes (window resize, sidebar open/close, rotation, etc.)
  // - a new material loads (fileUrl changes)
  const autoFitRafRef = useRef(null);
  const fitRequestRef = useRef(0);
  const manualZoomRef = useRef(false);
  const resizeAutoFitTimeoutRef = useRef(null);

  const [pdfjs, setPdfjs] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharedView, setSharedView] = useState(null);
  const [pageSize, setPageSize] = useState({width:0,height:0});
  const sharedViewRef = useRef(null);
  const pendingRestoreRef = useRef(null);
  const pendingPageRef = useRef(null);
  const [restoreVersion, setRestoreVersion] = useState(0);
  sharedViewRef.current = sharedView;
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const dict = getDictionary(locale, "resources");
  // Effects read messages through a ref: when the translations were a new
  // object on each render, listing them as a dependency re-rendered the page
  // on every render, which set state, which rendered again, forever.
  const dictRef = useRef(dict);
  dictRef.current = dict;
  const renderTaskRef = useRef(null);
  const loadingTaskRef = useRef(null);
  const onFatalErrorRef = useRef(onFatalError);
  const onContainerReadyRef = useRef(onContainerReady);
  const onScrollContainerReadyRef = useRef(onScrollContainerReady);

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.1;

  const setManualZoom = useCallback((value) => {
    pendingRestoreRef.current = null;
    sharedViewRef.current = null;
    setSharedView(null);
    manualZoomRef.current = true;
    fitRequestRef.current += 1;
    setZoom((previous) => {
      const next = typeof value === "function" ? value(previous) : value;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    });
  }, []);

  useEffect(() => {
    // A newly selected material starts fitted; subsequent manual calibration
    // stays in place until the teacher explicitly presses Fit.
    manualZoomRef.current = false;
    fitRequestRef.current += 1;
    setZoom(1);
    setSharedView(null);
  }, [fileUrl]);

  useEffect(() => {
    onFatalErrorRef.current = onFatalError;
  }, [onFatalError]);

  useEffect(() => {
    onContainerReadyRef.current = onContainerReady;
  }, [onContainerReady]);

  useEffect(() => {
    onScrollContainerReadyRef.current = onScrollContainerReady;
  }, [onScrollContainerReady]);

  // Fit each page from its actual PDF dimensions and the current visible panel.
  const applyFit = useCallback(() => {
    if (!pdfDoc || !pageWrapperRef.current || !mainRef.current) return;
    const requestId = ++fitRequestRef.current;
    pdfDoc.getPage(currentPage).then((page) => {
      if (requestId !== fitRequestRef.current) return;
      const viewport = page.getViewport({ scale: 1 });
      const container = mainRef.current;
      const fitWholePage = fitMode === "page" ||
        (fitMode === "classroom" && window.matchMedia(COMPACT_CLASSROOM_QUERY).matches);
      if (!container || !viewport.width || !viewport.height ||
        container.clientWidth <= 0 || (fitWholePage && container.clientHeight <= 0)) return;
      const style = window.getComputedStyle(container);
      const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const availableWidth = Math.max(1, container.clientWidth - horizontalPadding - 2);
      const availableHeight = Math.max(1, container.clientHeight - verticalPadding - 2);
      const widthZoom = availableWidth / viewport.width;
      const fitZoom = sharedViewRef.current ? regionFitZoom(viewport,
        {width:availableWidth,height:availableHeight},sharedViewRef.current) : fitWholePage
        ? Math.min(widthZoom, availableHeight / viewport.height)
        : widthZoom;
      if (Number.isFinite(fitZoom) && fitZoom > 0) {
        const boundedZoom = Math.min(MAX_ZOOM, fitZoom);
        setZoom((previous) => Math.abs(previous - boundedZoom) < 0.002 ? previous : boundedZoom);
      }
    }).catch(() => {});
  }, [pdfDoc, currentPage, fitMode]);

  const fitToPage = useCallback(() => {
    pendingRestoreRef.current = null;
    manualZoomRef.current = false;
    sharedViewRef.current = null;
    setSharedView(null);
    applyFit();
  }, [applyFit]);

  const autoFit = useCallback(() => {
    if (!manualZoomRef.current || sharedViewRef.current) applyFit();
  }, [applyFit]);

  const applyView = useCallback((view) => {
    if (!view || !Number.isFinite(view.page)) return;
    const region = normalizePdfRegion(view.region);
    if (view.manual && !region) return;
    if (!pdfDoc) pendingPageRef.current = view.page;
    setCurrentPage(Math.max(1, Math.min(numPages || view.page, Math.floor(view.page))));
    manualZoomRef.current = Boolean(view.manual);
    sharedViewRef.current = view.manual ? region : null;
    setSharedView(view.manual ? region : null);
    // Fitting runs after the target page/state is committed below.
    requestAnimationFrame(() => applyFit());
  }, [numPages, pdfDoc, applyFit]);

  const restoreView = useCallback((view) => {
    if (!view || !Number.isFinite(view.page)) return;
    const region = normalizePdfRegion(view.region);
    if (!region) return;
    // A presenter resumes on the full, scrollable page. Cropping is only
    // for participants following a remote presenter.
    pendingRestoreRef.current = { ...view, region };
    setRestoreVersion(version => version + 1);
    sharedViewRef.current = null;
    setSharedView(null);
    manualZoomRef.current = Boolean(view.manual);
    setCurrentPage(Math.max(1, Math.min(numPages || view.page, Math.floor(view.page))));
    if (!view.manual) applyFit();
  }, [numPages, applyFit]);

  const getView = useCallback(() => {
    const panel=mainRef.current, wrapper=pageWrapperRef.current;
    if (!panel || !wrapper || !pdfDoc || loading || pendingRestoreRef.current) return null;
    const region=visiblePdfRegion(wrapper.getBoundingClientRect(),panel.getBoundingClientRect());
    if (!region) return null;
    return {page:currentPage,manual:manualZoomRef.current || panel.scrollTop>1 || panel.scrollLeft>1,region};
  }, [currentPage, pdfDoc, loading]);

  useEffect(() => {
    const panel=mainRef.current;
    if (!panel || !pdfDoc) return;
    let frame;
    const publish=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        if (!sharedViewRef.current) {
          const view=getView();
          if (view) onViewportChangeRef.current?.(view);
        }
      });
    };
    panel.addEventListener('scroll',publish,{passive:true});
    publish();
    return ()=>{panel.removeEventListener('scroll',publish);cancelAnimationFrame(frame);};
  }, [scrollElement,pdfDoc,currentPage,zoom,loading,getView]);

  useEffect(() => { if (pdfDoc && sharedView) applyFit(); }, [pdfDoc,currentPage,sharedView,applyFit]);

  // Schedule fitting after layout has settled.
  // - Runs automatically on load
  // - Runs automatically on resize
  // - Runs automatically when fileUrl changes (new material)
  const requestAutoFit = useCallback(() => {
    if (!pdfDoc) return;

    if (autoFitRafRef.current) cancelAnimationFrame(autoFitRafRef.current);

    autoFitRafRef.current = requestAnimationFrame(() => {
      autoFit();
    });
  }, [pdfDoc, autoFit]);

  // Expose the page wrapper element to parent
  const updateContainerRef = useCallback(() => {
    const handler = onContainerReadyRef.current;
    if (typeof handler === "function" && pageWrapperRef.current) {
      handler(pageWrapperRef.current);
    }
  }, []);

  useEffect(() => {
    updateContainerRef();
  }, [updateContainerRef]);

  useEffect(() => {
    onScrollContainerReadyRef.current?.(scrollElement);
    return () => onScrollContainerReadyRef.current?.(null);
  }, [scrollElement]);

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
        zoomIn: () => setManualZoom((z) => Math.round((z + ZOOM_STEP) * 100) / 100),
        zoomOut: () => setManualZoom((z) => Math.round((z - ZOOM_STEP) * 100) / 100),
        setZoomPercent: (percent) => setManualZoom(Number(percent) / 100),
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        zoomFit: fitToPage,
        fitToPage, // NEW: Expose fitToPage
        autoFit,
        applyView,
        restoreView,
        getView,
        setPage: (page) =>
          setCurrentPage(Math.max(1, Math.min(numPages, page))),
      });
    }
  }, [currentPage, numPages, zoom, onNavStateChange, fitToPage, autoFit, setManualZoom, applyView, restoreView, getView]);

  // Load pdf.js lazily
  useEffect(() => {
    if (!fileUrl) return;

    let cancelled = false;

    async function loadPdfJs() {
      try {
        // PDF.js v5 is ESM-only. Use the explicit browser module path so
        // Next's dev and production bundlers do not resolve the extensionless
        // entrypoint as an empty CommonJS module (which causes
        // `Object.defineProperty called on non-object` locally).
        // The minified ESM entrypoint avoids a known Webpack 5.98 runtime
        // bug in Next 16 dev that can throw `Object.defineProperty called
        // on non-object` while evaluating the unminified PDF.js bundle.
        const mod = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
        const pdfjsLib =
          mod && typeof mod.default === "object" ? mod.default : mod;

        if (!pdfjsLib || typeof pdfjsLib.getDocument !== "function") {
          throw new Error("PDF.js loaded without a usable getDocument API");
        }

        if (typeof window !== "undefined") {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.${pdfjsLib.version}.min.mjs`;
        }

        if (!cancelled) {
          setPdfjs(pdfjsLib);
        }
      } catch (err) {
        console.error("Failed to load pdf.js", err);
        if (!cancelled) {
          setError(t(dictRef.current, "resources_pdf_engine_error"));
          setLoading(false);
          onFatalErrorRef.current?.(err);
        }
      }
    }

    loadPdfJs();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  // ✅ Auto-fit when a new PDF loads (or when the URL changes)
  useEffect(() => {
    // wait a tick for layout to stabilize
    const id = setTimeout(() => {
      requestAutoFit();
    }, 0);

    return () => clearTimeout(id);
  }, [fileUrl, pdfDoc, requestAutoFit]);

  // ✅ Auto-fit when the container changes size (mobile rotation, responsive layout, etc.)
  useEffect(() => {
    if (!pdfDoc) return;

    const el = mainRef.current;
    if (!el) return;

    const handle = () => {
      if (resizeAutoFitTimeoutRef.current) {
        clearTimeout(resizeAutoFitTimeoutRef.current);
      }

      // Debounce resize-driven fitting so divider dragging doesn't
      // continuously rerender the PDF canvas.
      resizeAutoFitTimeoutRef.current = setTimeout(() => {
        requestAutoFit();
      }, 180);
    };

    // ResizeObserver catches sidebar toggles, container changes, etc.
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(handle);
      ro.observe(el);
    } else {
      window.addEventListener("resize", handle, { passive: true });
    }

    // Mobile rotation
    window.addEventListener("orientationchange", handle, { passive: true });

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", handle);
      window.removeEventListener("orientationchange", handle);
      if (resizeAutoFitTimeoutRef.current) {
        clearTimeout(resizeAutoFitTimeoutRef.current);
        resizeAutoFitTimeoutRef.current = null;
      }
    };
  }, [pdfDoc, requestAutoFit]);

  // Load the PDF document
  useEffect(() => {
    if (!pdfjs || !fileUrl) return;

    let cancelled = false;

    const destroyLoadingTask = (task) => {
      if (!task || typeof task.destroy !== "function") return;
      try {
        const result = task.destroy();
        if (result && typeof result.catch === "function") {
          result.catch(() => {});
        }
      } catch {
        // A task may already have completed or been canceled.
      }
    };

    async function loadDocument() {
      setLoading(true);
      setError(null);
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);

      try {
        destroyLoadingTask(loadingTaskRef.current);
        // Fetch only the byte ranges needed for the visible page. Both the
        // classroom upload API and the library PDF proxy support ranges;
        // pdf.js falls back to a full download when a host does not.
        // Downloading whole PDFs up front used to compete with the call.
        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          disableRange: false,
          disableStream: true,
          disableAutoFetch: true,
          rangeChunkSize: 256 * 1024,
          withCredentials: false,
        });
        loadingTaskRef.current = loadingTask;

        const doc = await loadingTask.promise;
        if (cancelled) {
          try { doc.destroy(); } catch (_) { }
          return;
        }

        if (loadingTaskRef.current === loadingTask) {
          loadingTaskRef.current = null;
        }
        setPdfDoc(doc);
        setNumPages(doc.numPages || 0);
        const requestedPage = pendingRestoreRef.current?.page || pendingPageRef.current;
        if (requestedPage) {
          setCurrentPage(Math.max(1, Math.min(doc.numPages, requestedPage)));
          pendingPageRef.current = null;
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to load PDF document:", err);
        if (!cancelled) {
          let msg = t(dictRef.current, "resources_pdf_load_generic_error");

          if (err.message?.includes("Missing PDF")) {
            msg = t(dictRef.current, "resources_pdf_missing_error");
          } else if (err.message?.includes("Invalid PDF")) {
            msg = t(dictRef.current, "resources_pdf_invalid_error");
          } else if (err.name === "MissingPDFException") {
            msg = t(dictRef.current, "resources_pdf_missing_error");
          } else if (
            err.message?.includes("fetch") ||
            err.message?.includes("network")
          ) {
            msg = t(dictRef.current, "resources_pdf_network_error");
          }

          setError(msg);
          setLoading(false);
          onFatalErrorRef.current?.(err);
        }
      }
    }

    loadDocument();

    return () => {
      cancelled = true;
      if (loadingTaskRef.current) {
        destroyLoadingTask(loadingTaskRef.current);
        loadingTaskRef.current = null;
      }
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
        } catch (_) { }
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const restore = pendingRestoreRef.current;
        const panel = mainRef.current;
        if (restore?.manual && panel) {
          const base = page.getViewport({ scale: 1 });
          const style = getComputedStyle(panel);
          const restoredZoom = regionFitZoom(base, {
            width: panel.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2,
            height: panel.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 2,
          }, restore.region);
          if (restoredZoom && Math.abs(restoredZoom - zoom) >= .002) {
            setZoom(restoredZoom);
            return;
          }
        }

        const viewport = page.getViewport({ scale: zoom });
        setPageSize(previous => {
          const width=viewport.width/zoom,height=viewport.height/zoom;
          return previous.width===width&&previous.height===height ? previous : {width,height};
        });
        const outputScale = getCanvasOutputScale(viewport.width, viewport.height);

        // Render off-screen, then swap in one step. Resizing the visible
        // canvas first cleared it, so every page turn, zoom or fit flashed
        // white until the new page finished rendering.
        const offscreen = document.createElement("canvas");
        offscreen.width = Math.max(1, Math.floor(viewport.width * outputScale));
        offscreen.height = Math.max(1, Math.floor(viewport.height * outputScale));
        const offscreenContext = offscreen.getContext("2d");
        offscreenContext.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderTask = page.render({ canvasContext: offscreenContext, viewport });
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        const canvas = pdfCanvasRef.current;
        if (!cancelled && canvas) {
          canvas.width = offscreen.width;
          canvas.height = offscreen.height;
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.getContext("2d").drawImage(offscreen, 0, 0);
        }
        // Release the off-screen bitmap right away.
        offscreen.width = 0;
        offscreen.height = 0;

        if (!cancelled) {
          if (restore && panel && pendingRestoreRef.current === restore) {
            pendingRestoreRef.current = null;
            panel.scrollTop = restore.region.y * viewport.height;
            panel.scrollLeft = restore.region.x * viewport.width;
          }
          setLoading(false);
          updateContainerRef();
        }
      } catch (err) {
        if (cancelled) return;
        if (err.name === "RenderingCancelledException") return;

        console.error("Failed to render PDF page:", err);
        setError(t(dictRef.current, "resources_pdf_render_error"));
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
        } catch (_) { }
      }
    };
  }, [pdfDoc, currentPage, zoom, updateContainerRef, restoreVersion]);

  // ✅ Cleanup auto-fit RAF on unmount
  useEffect(() => {
    return () => {
      if (loadingTaskRef.current) {
        try {
          const result = loadingTaskRef.current.destroy?.();
          if (result && typeof result.catch === "function") result.catch(() => {});
        } catch {
          // no-op
        }
        loadingTaskRef.current = null;
      }
      if (autoFitRafRef.current) {
        cancelAnimationFrame(autoFitRafRef.current);
        autoFitRafRef.current = null;
      }
      if (resizeAutoFitTimeoutRef.current) {
        clearTimeout(resizeAutoFitTimeoutRef.current);
        resizeAutoFitTimeoutRef.current = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        try {
          pdfDoc.destroy();
        } catch (_) { }
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
    setManualZoom((z) => Math.round((z - ZOOM_STEP) * 100) / 100);
  }

  function zoomIn() {
    setManualZoom((z) => Math.round((z + ZOOM_STEP) * 100) / 100);
  }

  function zoomFit() {
    fitToPage();
    onFitToPage?.();
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
    <div className={`prep-pdf-layout ${fitMode === 'classroom' ? 'prep-pdf-layout--adaptive' : ''}`}>
      {/* MAIN AREA */}
      <div className="prep-pdf-main">
        <div className="prep-pdf-main-inner" ref={attachScrollContainer} data-lenis-prevent>
          {loading && !pdfDoc && (
            <div className="cpv-loading">
              <div className="cpv-loading__spinner" />
              <span>{t(dict, "resources_pdf_loading")}</span>
            </div>
          )}

          {/* Canvas + overlay */}
          <div className={sharedView ? "cpv-shared-window" : "cpv-page-window"}
            style={sharedView ? {
              width: pageSize.width * zoom * sharedView.width,
              height: pageSize.height * zoom * sharedView.height,
            } : undefined}>
          <div
            className="cpv-page-wrapper"
            ref={pageWrapperRef}
            style={{ position: sharedView ? "absolute" : "relative", display: "inline-block",
              ...(sharedView ? {left: `${-sharedView.x * pageSize.width * zoom}px`,
                top: `${-sharedView.y * pageSize.height * zoom}px`} : {}) }}
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
              <PdfZoomSlider
                zoom={zoom}
                onChange={(percent) => setManualZoom(percent / 100)}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
              />
              <button
                type="button"
                className="cpv-nav__zoom"
                onClick={zoomFit}
                title={t(dict, "resources_pdf_zoom_reset")}
              >
                {Math.round(zoom * 100)}%
              </button>
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
                onClick={zoomFit}
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
              <PdfPageIndicator
                dict={dict}
                currentPage={currentPage}
                numPages={numPages}
              />
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
        <aside className="prep-pdf-sidebar" data-lenis-prevent>
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
    setZoomPercent,
    minZoom = 0.1,
    maxZoom = 5,
    fitToPage, // NEW
  } = navState;

  return (
    <div className={`cpv-nav cpv-nav--external ${className}`}>
      <div className="cpv-nav__left">
        <button
          type="button"
          className="cpv-nav__btn"
          onClick={zoomOut}
          disabled={zoom <= minZoom}
          title={t(dict, "resources_pdf_zoom_out")}
        >
          −
        </button>
        <PdfZoomSlider zoom={zoom} onChange={setZoomPercent} min={minZoom} max={maxZoom} />
        <button
          type="button"
          className="cpv-nav__zoom"
          onClick={zoomFit}
          title={t(dict, "resources_pdf_zoom_reset")}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="cpv-nav__btn"
          onClick={zoomIn}
          disabled={zoom >= maxZoom}
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
        <PdfPageIndicator
          dict={dict}
          currentPage={currentPage}
          numPages={numPages}
        />
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
