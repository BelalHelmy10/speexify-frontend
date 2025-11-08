"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import "@/styles/payment-result.scss";
import api from "@/lib/api";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let timer = null;

    const orderId = searchParams.get("order"); // you set this as merchant_order_id
    const successParam = searchParams.get("success");

    // If we don't have an orderId, just fallback to the query param
    if (!orderId) {
      setStatus(successParam === "true" ? "success" : "failed");
      return;
    }

    // Poll the backend for the real order status (webhook sets it)
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

  if (status === "loading") {
    return (
      <div className="payment-result payment-result--loading">
        <div className="payment-result__container">
          <div className="payment-result__loading">
            <div className="payment-result__spinner"></div>
            <p className="payment-result__loading-text">
              Processing payment...
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="payment-result__title">Payment Successful!</h1>
            <p className="payment-result__message">
              Your payment has been processed successfully.
              {searchParams.get("order") && (
                <span className="payment-result__order">
                  {" "}
                  Order ID: {searchParams.get("order")}
                </span>
              )}
            </p>
            <div className="payment-result__actions">
              <button
                onClick={() => router.push("/onboarding")}
                className="payment-result__btn payment-result__btn--primary"
              >
                Start onboarding
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="payment-result__btn payment-result__btn--ghost"
              >
                Go to Dashboard
              </button>
            </div>

            <p className="payment-result__small">
              Your credits are now available. If they don’t appear immediately,
              give it a few seconds and refresh — we confirm payment via a
              secure webhook.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="payment-result__title">Payment Failed</h1>
          <p className="payment-result__message">
            Your payment could not be processed. Please try again.
          </p>
          <button
            onClick={() => router.push("/packages")}
            className="payment-result__btn payment-result__btn--primary"
          >
            Try Again
          </button>
          <p className="payment-result__small">
            If you were charged but still see this, email{" "}
            <strong>hello@speexify.com</strong> with your Order ID.
          </p>
        </div>
      </div>
    </div>
  );
}
