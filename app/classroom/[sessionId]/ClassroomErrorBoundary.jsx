"use client";

import { Component } from "react";
import Link from "next/link";
import api from "@/lib/api";
import Sentry from "@/lib/sentry";
import { classroomText } from "./classroomCopy";

function getErrorPayload(error, errorInfo, sessionId) {
  const location =
    typeof window !== "undefined"
      ? {
          href: window.location.href,
          pathname: window.location.pathname,
        }
      : null;

  const userAgent =
    typeof window !== "undefined" ? window.navigator?.userAgent || "" : "";

  return {
    sessionId: String(sessionId || ""),
    name: error?.name || "Error",
    message: error?.message || "Unknown classroom render error",
    stack: error?.stack || "",
    componentStack: errorInfo?.componentStack || "",
    location,
    userAgent,
  };
}

export default class ClassroomErrorBoundary extends Component {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const payload = getErrorPayload(error, errorInfo, this.props.sessionId);

    try {
      Sentry.captureException?.(error, {
        contexts: {
          classroom: {
            sessionId: payload.sessionId,
            componentStack: payload.componentStack,
          },
        },
      });
    } catch (_) { }

    void api
      .post(`/sessions/${payload.sessionId}/classroom-error`, payload)
      .catch((reportError) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to report classroom render error", reportError);
        }
      });
  }

  handleRejoin = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { prefix = "", sessionId } = this.props;
    const classroomHref = `${prefix}/classroom/${sessionId}`;
    const locale = prefix === "/ar" ? "ar" : "en";

    return (
      <div className="cr-error-screen">
        <div className="cr-error-screen__content">
          <span className="cr-error-screen__icon" aria-hidden="true">!</span>
          <h1 className="cr-error-screen__title">{classroomText(locale, "cr_reload_title")}</h1>
          <p className="cr-error-screen__text">{classroomText(locale, "cr_reload_text")}</p>
          <div className="cr-error-screen__actions">
            <button
              type="button"
              className="cr-error-screen__btn"
              onClick={this.handleRejoin}
            >
              {classroomText(locale, "cr_rejoin_classroom")}
            </button>
            <Link
              href={classroomHref}
              className="cr-error-screen__btn cr-error-screen__btn--ghost"
            >
              {classroomText(locale, "cr_open_classroom_link")}
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
