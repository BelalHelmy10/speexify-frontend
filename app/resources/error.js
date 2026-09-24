"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sentry from "@/lib/sentry";

export default function ResourcesError({ error, reset }) {
  const pathname = usePathname();
  const router = useRouter();
  const isArabic = pathname?.startsWith("/ar/") || pathname === "/ar";

  useEffect(() => {
    try {
      Sentry.captureException?.(error, {
        tags: {
          area: "resources",
          source: "server-render",
        },
      });
    } catch {
      // Error reporting must not block the retry UI.
    }
  }, [error]);

  const copy = isArabic
    ? {
        title: "حصلت مشكلة في تحميل مكتبة المواد",
        body: "الصفحة متاحة، لكن حصل خطأ غير متوقع. جرّب تاني بعد لحظات.",
        retry: "حاول تاني",
      }
    : {
        title: "The resource library could not load",
        body: "The page is still available, but an unexpected error occurred. Try again in a moment.",
        retry: "Try again",
      };

  const handleRetry = () => {
    reset();
    router.refresh();
  };

  return (
    <main className="spx-resources-page">
      <div className="spx-resources-page__inner">
        <section className="spx-resources-unavailable" role="alert" aria-live="polite">
          <div>
            <h1 className="spx-resources-unavailable__title">{copy.title}</h1>
            <p className="spx-resources-unavailable__body">{copy.body}</p>
          </div>
          <button
            type="button"
            className="spx-resources-unavailable__button"
            onClick={handleRetry}
          >
            {copy.retry}
          </button>
        </section>
      </div>
    </main>
  );
}
