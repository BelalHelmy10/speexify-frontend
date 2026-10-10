"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  Download,
  ExternalLink,
  FileText,
  LockKeyhole,
} from "lucide-react";
import api from "@/lib/api";
import { getSafeExternalUrl } from "@/utils/url";
import PrepShell from "@/app/resources/prep/PrepShell";
import ClassroomResourceWorkspace from "./ClassroomResourceWorkspace";
import { buildResourceIndex, getViewerInfo } from "./classroomHelpers";

const COPY = {
  en: {
    eyebrow: "Completed session",
    title: "Session review",
    subtitle: "Revisit every material your teacher opened during this lesson.",
    readonly: "Read-only review",
    back: "Session details",
    material: "material",
    materials: "materials",
    opened: "First opened",
    download: "Download material",
    downloading: "Preparing download…",
    open: "Open original",
    emptyTitle: "No materials were opened",
    emptyBody: "This session does not have any classroom materials to review yet.",
    loadError: "We could not load this session review.",
    downloadError: "This material could not be downloaded. You can still open the original.",
  },
  ar: {
    eyebrow: "جلسة مكتملة",
    title: "مراجعة الجلسة",
    subtitle: "راجع كل المواد التي فتحها معلمك أثناء هذا الدرس.",
    readonly: "مراجعة للقراءة فقط",
    back: "تفاصيل الجلسة",
    material: "مادة",
    materials: "مواد",
    opened: "فُتحت أول مرة",
    download: "تنزيل المادة",
    downloading: "جارٍ تجهيز التنزيل…",
    open: "فتح المصدر",
    emptyTitle: "لم يتم فتح أي مواد",
    emptyBody: "لا توجد مواد من الفصل لمراجعتها في هذه الجلسة حتى الآن.",
    loadError: "تعذر تحميل مراجعة هذه الجلسة.",
    downloadError: "تعذر تنزيل هذه المادة. لا يزال بإمكانك فتح المصدر.",
  },
};

function safeFilename(resource, viewerType) {
  const fallback = viewerType === "pdf" ? "session-material.pdf" : "session-material";
  const source = resource?.fileName || resource?.title || fallback;
  const cleaned = String(source).replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").trim();
  if (!cleaned) return fallback;
  if (viewerType === "pdf" && !cleaned.toLowerCase().endsWith(".pdf")) {
    return `${cleaned}.pdf`;
  }
  return cleaned;
}

function formatReviewDate(value, locale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function ClassroomReviewShell({
  session,
  sessionId,
  tracks,
  locale = "en",
  prefix = "",
}) {
  const copy = COPY[locale] || COPY.en;
  const [review, setReview] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [selectedResourceId, setSelectedResourceId] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");

    api.get(`/sessions/${sessionId}/review`)
      .then(({ data }) => {
        if (cancelled) return;
        const loaded = data?.review || null;
        setReview(loaded);
        setSelectedResourceId(loaded?.resources?.[0]?.id || null);
        setStatus("ok");
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(requestError?.response?.data?.error || copy.loadError);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [copy.loadError, sessionId]);

  const { resourcesById } = useMemo(() => buildResourceIndex(tracks || []), [tracks]);
  const resources = useMemo(() => {
    const uploadedById = Object.fromEntries(
      (review?.materials || []).map((material) => [material._id, material])
    );

    return (review?.resources || []).map((entry) => {
      const libraryResource = resourcesById[entry.id] || {};
      const uploadedMaterial = uploadedById[entry.id] || {};
      return {
        ...libraryResource,
        ...(entry.snapshot || {}),
        ...uploadedMaterial,
        _id: entry.id,
        title:
          uploadedMaterial.title ||
          entry.snapshot?.title ||
          entry.title ||
          libraryResource.title ||
          (locale === "ar" ? "مادة الجلسة" : "Session material"),
        reviewOpenedAt: entry.firstOpenedAt,
      };
    });
  }, [locale, resourcesById, review]);

  const selectedResource = resources.find((resource) => resource._id === selectedResourceId) || null;
  const selectedViewer = getViewerInfo(selectedResource);
  const rawUrl = selectedViewer?.rawUrl?.startsWith("/")
    ? selectedViewer.rawUrl
    : getSafeExternalUrl(selectedViewer?.rawUrl);
  const downloadUrl = selectedViewer?.type === "pdf"
    ? selectedViewer.viewerUrl
    : selectedResource?.fileUrl || null;

  async function downloadSelectedMaterial() {
    if (!downloadUrl || !selectedResource) return;
    setDownloadStatus("loading");
    setError("");
    try {
      const response = await fetch(downloadUrl, { credentials: "include" });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = safeFilename(selectedResource, selectedViewer?.type);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setDownloadStatus("idle");
    } catch (downloadError) {
      console.warn("Failed to download review material", downloadError);
      setError(copy.downloadError);
      setDownloadStatus("error");
    }
  }

  if (status === "loading") {
    return (
      <div className="cr-loading-screen">
        <div className="cr-loading-screen__content">
          <div className="cr-loading-screen__spinner" />
          <h1 className="cr-loading-screen__title">{copy.title}</h1>
          <p className="cr-loading-screen__text">{copy.subtitle}</p>
        </div>
      </div>
    );
  }

  if (status === "error" || !review) {
    return (
      <div className="cr-error-screen">
        <div className="cr-error-screen__content">
          <BookOpenCheck size={36} aria-hidden="true" />
          <h1 className="cr-error-screen__title">{copy.title}</h1>
          <p className="cr-error-screen__text">{error || copy.loadError}</p>
          <Link href={`${prefix}/dashboard/sessions/${sessionId}`} className="cr-error-screen__btn">
            {copy.back}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="cr-review" dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className="cr-review__header">
        <div className="cr-review__heading">
          <Link href={`${prefix}/dashboard/sessions/${sessionId}`} className="cr-review__back">
            <ArrowLeft size={17} aria-hidden="true" />
            {copy.back}
          </Link>
          <span className="cr-review__eyebrow">{copy.eyebrow}</span>
          <h1>{review.title || session?.title || copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>

        <div className="cr-review__meta">
          <span className="cr-review__readonly"><LockKeyhole size={14} />{copy.readonly}</span>
          <span className="cr-review__count">
            <FileText size={15} />
            {resources.length} {resources.length === 1 ? copy.material : copy.materials}
          </span>
          <time>{formatReviewDate(review.completedAt || review.endAt, locale)}</time>
        </div>
      </header>

      {resources.length === 0 ? (
        <section className="cr-review__empty">
          <BookOpenCheck size={42} aria-hidden="true" />
          <h2>{copy.emptyTitle}</h2>
          <p>{copy.emptyBody}</p>
        </section>
      ) : (
        <section className="cr-review__stage">
          <div className="cr-review__material-bar">
            <div>
              <strong>{selectedResource?.title}</strong>
              {selectedResource?.reviewOpenedAt && (
                <span>{copy.opened}: {formatReviewDate(selectedResource.reviewOpenedAt, locale)}</span>
              )}
            </div>
            <div className="cr-review__material-actions">
              {downloadUrl && (
                <button
                  type="button"
                  onClick={downloadSelectedMaterial}
                  disabled={downloadStatus === "loading"}
                >
                  <Download size={16} />
                  {downloadStatus === "loading" ? copy.downloading : copy.download}
                </button>
              )}
              {rawUrl && (
                <a href={rawUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  {copy.open}
                </a>
              )}
            </div>
          </div>

          {error && <p className="cr-review__notice" role="status">{error}</p>}

          <ClassroomResourceWorkspace
            resources={resources}
            selectedResourceId={selectedResourceId}
            onSelect={(resourceId) => {
              setSelectedResourceId(resourceId);
              setDownloadStatus("idle");
              setError("");
            }}
            onClose={() => {}}
            onOpenPicker={() => {}}
            canManage={false}
            locale={locale}
            renderResource={(resource, isActive) => (
              <PrepShell
                resource={resource}
                viewer={getViewerInfo(resource)}
                isActive={isActive}
                hideSidebar
                hideBreadcrumbs
                isTeacher={false}
                sessionId={sessionId}
                locale={locale}
                readOnly
                annotationsEndpoint={`/sessions/${sessionId}/review/annotations`}
              />
            )}
          />
        </section>
      )}
    </main>
  );
}
