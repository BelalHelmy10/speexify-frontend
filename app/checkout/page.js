"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { me } from "@/lib/auth";
import "@/styles/checkout.scss";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [pkg, setPkg] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPkg, setLoadingPkg] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);

  const planTitle = searchParams.get("plan");

  // Fetch current user
  useEffect(() => {
    (async () => {
      try {
        const userData = await me();
        setUser(userData?.user || null);
      } catch (err) {
        console.log("User not logged in:", err);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  // Fetch package details
  useEffect(() => {
    if (!planTitle) {
      setLoadingPkg(false);
      return;
    }

    (async () => {
      try {
        const res = await api.get("/api/packages?audience=INDIVIDUAL");
        const packages = res.data || [];

        console.log("🔍 Looking for package:", planTitle);
        console.log(
          "📦 Available packages:",
          packages.map((p) => p.title)
        );

        const decodedTitle = decodeURIComponent(planTitle).trim();
        let selected = packages.find(
          (p) => p.title.toLowerCase() === decodedTitle.toLowerCase()
        );

        if (!selected) {
          selected = packages.find(
            (p) =>
              p.title.toLowerCase().includes(decodedTitle.toLowerCase()) ||
              decodedTitle.toLowerCase().includes(p.title.toLowerCase())
          );
        }

        console.log("✅ Found package:", selected);
        setPkg(selected);
      } catch (err) {
        console.error("Failed to load package:", err);
      } finally {
        setLoadingPkg(false);
      }
    })();
  }, [planTitle]);

  async function startPayment() {
    if (!pkg) return;

    try {
      setLoading(true);

      const USD_TO_EGP_RATE = 50;
      const amountEGP = pkg.priceUSD * USD_TO_EGP_RATE;
      const amountCents = Math.round(amountEGP * 100);

      const nameParts = (user?.name || "Guest User").split(" ");
      const firstName = nameParts[0] || "Guest";
      const lastName = nameParts.slice(1).join(" ") || "User";

      const body = {
        amountCents,
        orderId: `order_${Date.now()}_${pkg.id}${
          user ? `_user${user.id}` : "_guest"
        }`,
        currency: "EGP",
        customer: {
          firstName,
          lastName,
          email: user?.email || "guest@example.com",
          phone: "01000000000",
        },
      };

      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      }).then((r) => r.json());

      if (!res?.ok) throw new Error(res?.message || "Failed to init payment");

      window.location.href = res.iframeUrl;
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loadingPkg || loadingUser) {
    return (
      <div className="checkout-loading">
        <div className="checkout-loading-content">
          <div className="checkout-spinner"></div>
          <p className="checkout-loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="checkout-error">
        <div className="checkout-error-content">
          <h1 className="checkout-error-title">Package not found</h1>
          <p className="checkout-error-message">
            The package you selected could not be found.
          </p>
          <button
            onClick={() => router.push("/packages")}
            className="checkout-btn checkout-btn-primary"
          >
            View all packages
          </button>
        </div>
      </div>
    );
  }

  const USD_TO_EGP_RATE = 50;
  const priceEGP = pkg.priceUSD * USD_TO_EGP_RATE;

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        {/* Header with User Info */}
        <div className="checkout-header">
          <h1 className="checkout-title">Checkout</h1>
          {user && (
            <div className="checkout-user-badge">
              Logged in as{" "}
              <span className="checkout-user-email">{user.email}</span>
            </div>
          )}
        </div>

        {/* Login Warning (if not logged in) */}
        {!user && (
          <div className="checkout-alert checkout-alert-warning">
            <div className="checkout-alert-content">
              <div className="checkout-alert-icon">
                <svg
                  className="checkout-icon"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="checkout-alert-text">
                <h3 className="checkout-alert-title">Login required</h3>
                <p className="checkout-alert-message">
                  You'll be prompted to log in before payment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Package Summary */}
        <div className="checkout-card">
          <h2 className="checkout-card-title">{pkg.title}</h2>
          <p className="checkout-card-description">{pkg.description}</p>

          {/* Package Details */}
          <div className="checkout-details">
            {pkg.sessionsPerPack && (
              <div className="checkout-detail-row">
                <span className="checkout-detail-label">Sessions:</span>
                <span className="checkout-detail-value">
                  {pkg.sessionsPerPack}
                </span>
              </div>
            )}
            {pkg.durationMin && (
              <div className="checkout-detail-row">
                <span className="checkout-detail-label">
                  Duration per session:
                </span>
                <span className="checkout-detail-value">
                  {pkg.durationMin} min
                </span>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="checkout-pricing">
            <div className="checkout-price-row">
              <span className="checkout-price-label">Package Price (USD):</span>
              <span className="checkout-price-value">${pkg.priceUSD}</span>
            </div>
            <div className="checkout-price-row">
              <span className="checkout-price-label">Price (EGP):</span>
              <span className="checkout-price-value">
                EGP {priceEGP.toFixed(2)}
              </span>
            </div>
            <div className="checkout-price-total">
              <span className="checkout-total-label">Total:</span>
              <span className="checkout-total-value">
                EGP {priceEGP.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Exchange Rate Note */}
          <div className="checkout-exchange-note">
            💱 Exchange rate: $1 USD = {USD_TO_EGP_RATE} EGP
          </div>
        </div>

        {/* Customer Information Preview (if logged in) */}
        {user && (
          <div className="checkout-card checkout-billing-card">
            <h3 className="checkout-billing-title">Billing Information</h3>
            <div className="checkout-billing-info">
              <div className="checkout-billing-row">
                <span className="checkout-billing-label">Name:</span>
                <span className="checkout-billing-value">
                  {user.name || "Not provided"}
                </span>
              </div>
              <div className="checkout-billing-row">
                <span className="checkout-billing-label">Email:</span>
                <span className="checkout-billing-value">{user.email}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Button */}
        <button
          onClick={startPayment}
          disabled={loading}
          className={`checkout-btn checkout-btn-pay ${
            loading ? "is-loading" : ""
          }`}
        >
          {loading ? (
            <span className="checkout-btn-loading">
              <svg
                className="checkout-spinner checkout-spinner-inline"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="checkout-spinner-track"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="checkout-spinner-path"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Pay EGP ${priceEGP.toFixed(2)}`
          )}
        </button>

        {/* Security Note */}
        <div className="checkout-security">
          🔒 Secured by Paymob payment gateway
        </div>

        {/* Back Link */}
        <div className="checkout-back">
          <button
            onClick={() => router.push("/packages")}
            className="checkout-back-link"
          >
            ← Back to packages
          </button>
        </div>
      </div>
    </div>
  );
}
