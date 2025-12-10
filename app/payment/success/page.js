// app/payment/success/page.js
"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import "@/styles/payment-result.scss";
import api from "@/lib/api";
import { getDictionary, t } from "@/app/i18n";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Detect locale from URL prefix (/ar/...)
  const locale = pathname && pathname.startsWith("/ar") ? "ar" : "en";
  const dict = useMemo(() => getDictionary(locale, "payment-result"), [locale]);

  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let timer = null;

    const orderId = searchParams.get("order"); // Paymob merchant_order_id
    const successParam = searchParams.get("success");

    if (!orderId) {
      setStatus(successParam === "true" ? "success" : "failed");
      return;
    }

    async function poll() {
      try {
        const { data } = await api.get(
          `/api/orders/${encodeURIComponent(orderId)}`
        );

        if (data?.status === "paid") {
          setStatus("success");
          return; // stop polling
        }
        if (data?.status === "failed" || data?.status === "canceled") {
          setStatus("failed");
          return; // stop polling
        }

        // keep polling while pending
        timer = setTimeout(poll, 1500);
      } catch (_e) {
        // if API not reachable, fallback to URL param once
        setStatus(successParam === "true" ? "success" : "failed");
      }
    }

    setStatus("loading");
    poll();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchParams]);

  const isArabic = locale === "ar";
  const onboardingPath = isArabic ? "/ar/onboarding" : "/onboarding";
  const dashboardPath = isArabic ? "/ar/dashboard" : "/dashboard";
  const packagesPath = isArabic ? "/ar/packages" : "/packages";

  // ---------- Loading ----------
  if (status === "loading") {
    return (
      <div className="payment-result payment-result--loading">
        <div className="payment-result__container">
          <div className="payment-result__loading">
            <div className="payment-result__spinner"></div>
            <p className="payment-result__loading-text">
              {t(dict, "loading_text")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Success ----------
  if (status === "success") {
    return (
      <div className="payment-result payment-result--success">
        <div className="payment-result__container">
          <div className="payment-result__card">
            <div className="payment-result__icon payment-result__icon--success">
              <svg
                className="payment-result__icon-svg"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="payment-result__title">
              {t(dict, "title_success")}
            </h1>

            <p className="payment-result__message">
              {t(dict, "message_success")}
              {searchParams.get("order") && (
                <span className="payment-result__order">
                  {" "}
                  {t(dict, "label_order_id")} {searchParams.get("order")}
                </span>
              )}
            </p>

            <div className="payment-result__actions">
              <button
                onClick={() => router.push(onboardingPath)}
                className="payment-result__btn payment-result__btn--primary"
              >
                {t(dict, "btn_start_onboarding")}
              </button>
              <button
                onClick={() => router.push(dashboardPath)}
                className="payment-result__btn payment-result__btn--ghost"
              >
                {t(dict, "btn_go_dashboard")}
              </button>
            </div>

            <p className="payment-result__small">
              {t(dict, "note_after_success")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Failed ----------
  return (
    <div className="payment-result payment-result--failed">
      <div className="payment-result__container">
        <div className="payment-result__card">
          <div className="payment-result__icon payment-result__icon--failed">
            <svg
              className="payment-result__icon-svg"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h1 className="payment-result__title">{t(dict, "title_failed")}</h1>

          <p className="payment-result__message">{t(dict, "message_failed")}</p>

          <button
            onClick={() => router.push(packagesPath)}
            className="payment-result__btn payment-result__btn--primary"
          >
            {t(dict, "btn_try_again")}
          </button>

          <p className="payment-result__small">{t(dict, "note_if_charged")}</p>
        </div>
      </div>
    </div>
  );
}
