"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import "@/styles/payment-result.scss";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const success = searchParams.get("success");
    const orderId = searchParams.get("order");
    const txnId = searchParams.get("id");

    if (success === "true") {
      setStatus("success");
    } else {
      setStatus("failed");
    }
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
            <button
              onClick={() => router.push("/dashboard")}
              className="payment-result__btn payment-result__btn--primary"
            >
              Go to Dashboard
            </button>
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
        </div>
      </div>
    </div>
  );
}
