// app/classroom/[sessionId]/ClassroomPageClient.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import ClassroomErrorBoundary from "./ClassroomErrorBoundary";
import ClassroomShell from "./ClassroomShell";
import ClassroomReviewShell from "./ClassroomReviewShell";
import { useClassroomText } from "./classroomText";

// Why the session could not load, from the response status.
function errorKindFor(err) {
  const status = err?.response?.status;
  if (status === 404) return "not_found";
  if (status === 401 || status === 403) return "forbidden";
  if (!err?.response) return "network";
  return "other";
}

export default function ClassroomPageClient({ sessionId, tracks, initialSession = null }) {
  const pathname = usePathname();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const prefix = locale === "ar" ? "/ar" : "";

  const [session, setSession] = useState(initialSession);
  const [status, setStatus] = useState(initialSession ? "ok" : "loading"); // "loading" | "ok" | "error"
  const [errorKind, setErrorKind] = useState("not_found");
  const [reloadKey, setReloadKey] = useState(0);
  const ct = useClassroomText();

  // Add class to body when classroom is active (to hide site header/footer)
  useEffect(() => {
    if (status === "ok" && session && typeof document !== "undefined") {
      document.body.classList.add("classroom-active");
      document.documentElement.classList.add("classroom-active");
    }

    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("classroom-active");
        document.documentElement.classList.remove("classroom-active");
      }
    };
  }, [status, session]);

  // Load session details from API
  useEffect(() => {
    if (!sessionId || initialSession) return;

    let cancelled = false;

    async function load() {
      try {
        setStatus("loading");

        const { data } = await api.get(`/sessions/${sessionId}`, {
          params: { classroomJoin: 1 },
        });
        if (cancelled) return;

        const loadedSession = data?.session || null;
        setSession(loadedSession);

        if (loadedSession) {
          setStatus("ok");
        } else {
          setStatus("error");
          setErrorKind("not_found");
        }
      } catch (err) {
        console.error("Failed to load session for classroom", err);
        if (cancelled) return;

        setErrorKind(errorKindFor(err));
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [initialSession, reloadKey, sessionId]);

  // LOADING - full screen loading
  if (status === "loading") {
    return (
      <div className="cr-loading-screen">
        <div className="cr-loading-screen__content">
          <div className="cr-loading-screen__spinner" />
          <h1 className="cr-loading-screen__title">{ct("cr_loading_title")}</h1>
          <p className="cr-loading-screen__text">
            {ct("cr_loading_text", { id: sessionId })}
          </p>
        </div>
      </div>
    );
  }

  // ERROR / NOT FOUND - full screen error
  if (status === "error" || !session) {
    return (
      <div className="cr-error-screen">
        <div className="cr-error-screen__content">
          <span className="cr-error-screen__icon">⚠️</span>
          <h1 className="cr-error-screen__title">{ct(`cr_error_${errorKind}_title`)}</h1>
          <p className="cr-error-screen__text">{ct(`cr_error_${errorKind}_text`)}</p>
          <div className="cr-error-screen__actions">
            {(errorKind === "network" || errorKind === "other") && (
              <button type="button" className="cr-error-screen__btn" onClick={() => setReloadKey((n) => n + 1)}>
                {ct("cr_error_try_again")}
              </button>
            )}
            <Link href={`${prefix}/dashboard`} className="cr-error-screen__btn cr-error-screen__btn--ghost">
              {ct("cr_back_to_dashboard")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isLearnerReview =
    session.isLearner === true &&
    session.isTeacher !== true &&
    session.reviewAvailable === true;

  return (
    <ClassroomErrorBoundary sessionId={String(sessionId)} prefix={prefix}>
      {isLearnerReview ? (
        <ClassroomReviewShell
          session={session}
          sessionId={String(sessionId)}
          tracks={tracks}
          locale={locale}
          prefix={prefix}
        />
      ) : (
        <ClassroomShell
          session={session}
          sessionId={String(sessionId)}
          tracks={tracks}
          locale={locale}
          prefix={prefix}
        />
      )}
    </ClassroomErrorBoundary>
  );
}
