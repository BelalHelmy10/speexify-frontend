// app/payment/success/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import "@/styles/payment-result.scss";
import api from "@/lib/api";
import { getDictionary, t } from "@/app/i18n";
import {
  getNetworkProfile,
  subscribeToNetworkProfileChanges,
} from "@/lib/network-profile";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Detect locale from URL prefix (/ar/...)
  const locale = pathname && pathname.startsWith("/ar") ? "ar" : "en";
  const dict = useMemo(() => getDictionary(locale, "payment"), [locale]);

  const [status, setStatus] = useState("loading");
  const [pollSeed, setPollSeed] = useState(0);
  const [actionError, setActionError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [networkProfile, setNetworkProfile] = useState(() => getNetworkProfile());

  const orderId = searchParams.get("order"); // Paymob merchant_order_id
  const successParam = searchParams.get("success");

  useEffect(() => {
    return subscribeToNetworkProfileChanges((nextProfile) => {
      setNetworkProfile(nextProfile);
    });
  }, []);

  useEffect(() => {
    let timer = null;
    let isUnmounted = false;

    if (!orderId) {
      setStatus(successParam === "true" ? "success" : "failed");
      return () => {};
    }

    const delayMs = networkProfile.isLowBandwidth ? 3000 : 1500;
    const maxPollAttempts = networkProfile.isLowBandwidth ? 12 : 20;

    let attempts = 0;

    async function poll() {
      if (isUnmounted) return;
      attempts += 1;

      try {
        const { data } = await api.get(
          `/api/payments/orders/${encodeURIComponent(orderId)}`
        );

        if (isUnmounted) return;

        if (data?.status === "paid") {
          setStatus("success");
          return;
        }

        if (data?.status === "failed" || data?.status === "canceled") {
          setStatus("failed");
          return;
        }

        if (attempts >= maxPollAttempts) {
          setStatus("pending_review");
          return;
        }

        timer = setTimeout(poll, delayMs);
      } catch (_e) {
        if (isUnmounted) return;

        if (successParam === "true") {
          setStatus("success");
          return;
        }

        if (attempts >= Math.max(3, Math.floor(maxPollAttempts / 3))) {
          setStatus("pending_review");
          return;
        }

        timer = setTimeout(poll, Math.round(delayMs * 1.5));
      }
    }

    setStatus("loading");
    setActionError("");
    poll();

    return () => {
      isUnmounted = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, successParam, pollSeed, networkProfile.isLowBandwidth]);

  async function retrySamePayment() {
    if (!orderId) return;

    try {
      setRetrying(true);
      setActionError("");

      const { data } = await api.post(
        `/api/payments/orders/${encodeURIComponent(orderId)}/retry-intent`
      );

      if (!data?.ok || !data?.iframeUrl) {
        throw new Error(data?.error || "Payment retry failed");
      }

      window.location.href = data.iframeUrl;
    } catch (error) {
      const message =
        error?.response?.data?.error || error?.message || "Payment retry failed";
      setActionError(String(message));
    } finally {
      setRetrying(false);
    }
  }

  function checkStatusAgain() {
    setActionError("");
    setPollSeed((prev) => prev + 1);
  }

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
              {orderId && (
                <span className="payment-result__order">
                  {t(dict, "label_order_id")} {orderId}
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

  // ---------- Pending review ----------
  if (status === "pending_review") {
    return (
      <div className="payment-result payment-result--loading">
        <div className="payment-result__container">
          <div className="payment-result__card">
            <h1 className="payment-result__title">
              {t(dict, "title_pending_review")}
            </h1>

            <p className="payment-result__message">
              {t(dict, "message_pending_review")}
              {orderId ? (
                <span className="payment-result__order">
                  {t(dict, "label_order_id")} {orderId}
                </span>
              ) : null}
            </p>

            <div className="payment-result__actions">
              <button
                onClick={checkStatusAgain}
                className="payment-result__btn payment-result__btn--primary"
              >
                {t(dict, "btn_check_status")}
              </button>

              {orderId ? (
                <button
                  onClick={retrySamePayment}
                  disabled={retrying}
                  className="payment-result__btn payment-result__btn--ghost"
                >
                  {retrying
                    ? t(dict, "loading_text")
                    : t(dict, "btn_retry_payment")}
                </button>
              ) : null}
            </div>

            {actionError ? (
              <p className="payment-result__small payment-result__small--error">
                {actionError}
              </p>
            ) : null}
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

          <p className="payment-result__message">
            {t(dict, "message_failed")}
            {orderId ? (
              <span className="payment-result__order">
                {t(dict, "label_order_id")} {orderId}
              </span>
            ) : null}
          </p>

          <div className="payment-result__actions">
            {orderId ? (
              <button
                onClick={retrySamePayment}
                disabled={retrying}
                className="payment-result__btn payment-result__btn--primary"
              >
                {retrying ? t(dict, "loading_text") : t(dict, "btn_retry_payment")}
              </button>
            ) : null}

            <button
              onClick={() => router.push(packagesPath)}
              className="payment-result__btn payment-result__btn--ghost"
            >
              {t(dict, "btn_back_packages")}
            </button>
          </div>

          {actionError ? (
            <p className="payment-result__small payment-result__small--error">
              {actionError}
            </p>
          ) : null}

          <p className="payment-result__small">{t(dict, "note_if_charged")}</p>
        </div>
      </div>
    </div>
  );
}
