"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { me } from "@/lib/auth";
import "@/styles/checkout.scss"; // New separate stylesheet

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
        console.log("User not logged in");
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

        const decodedTitle = decodeURIComponent(planTitle).trim();
        let selected = packages.find(
          (p) => p.title.toLowerCase() === decodedTitle.toLowerCase()
        );

        if (!selected) {
          selected = packages.find((p) =>
            p.title.toLowerCase().includes(decodedTitle.toLowerCase())
          );
        }

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
      <div className="spx-checkout">
        <div className="spx-checkout__container">
          <div className="spx-checkout__loading">
            <div className="spx-checkout__spinner"></div>
            <p className="spx-checkout__loading-text">Loading checkout...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="spx-checkout">
        <div className="spx-checkout__container">
          <div className="spx-checkout__error">
            <h1 className="spx-checkout__error-title">Package not found</h1>
            <p className="spx-checkout__error-text">
              The package you selected could not be found.
            </p>
            <Link
              href="/packages"
              className="spx-checkout__btn spx-checkout__btn--primary"
            >
              View all packages
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const USD_TO_EGP_RATE = 50;
  const priceEGP = pkg.priceUSD * USD_TO_EGP_RATE;

  return (
    <div className="spx-checkout">
      {/* Header */}
      <div className="spx-checkout__header">
        <div className="spx-checkout__container">
          <div className="spx-checkout__header-inner">
            <h1 className="spx-checkout__title">Checkout</h1>
            {user && (
              <div className="spx-checkout__user-info">
                <span className="spx-checkout__user-icon">👤</span>
                <span className="spx-checkout__user-email">{user.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guest Notice */}
      {!user && (
        <div className="spx-checkout__notice">
          <div className="spx-checkout__container">
            <div className="spx-checkout__notice-card">
              <div className="spx-checkout__notice-icon">ℹ️</div>
              <div className="spx-checkout__notice-content">
                <strong className="spx-checkout__notice-title">
                  Guest Checkout
                </strong>
                <p className="spx-checkout__notice-text">
                  Checking out as a guest.{" "}
                  <Link href="/login" className="spx-checkout__notice-link">
                    Log in
                  </Link>{" "}
                  to save your order history.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="spx-checkout__main">
        <div className="spx-checkout__container">
          <div className="spx-checkout__content">
            {/* Package Summary */}
            <div className="spx-checkout__card">
              <div className="spx-checkout__package">
                {pkg.image && (
                  <div className="spx-checkout__package-image">
                    <img src={pkg.image} alt={pkg.title} />
                  </div>
                )}
                <div className="spx-checkout__package-details">
                  <h2 className="spx-checkout__package-title">{pkg.title}</h2>
                  {pkg.description && (
                    <p className="spx-checkout__package-desc">
                      {pkg.description}
                    </p>
                  )}
                  <div className="spx-checkout__package-meta">
                    {pkg.sessionsPerPack && (
                      <div className="spx-checkout__package-meta-item">
                        <strong>{pkg.sessionsPerPack}</strong> sessions
                      </div>
                    )}
                    {pkg.durationMin && (
                      <div className="spx-checkout__package-meta-item">
                        <strong>{pkg.durationMin}</strong> min each
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="spx-checkout__pricing">
                <div className="spx-checkout__price-row">
                  <span className="spx-checkout__price-label">
                    Package Price (USD)
                  </span>
                  <span className="spx-checkout__price-value">
                    ${pkg.priceUSD}
                  </span>
                </div>
                <div className="spx-checkout__price-row">
                  <span className="spx-checkout__price-label">Price (EGP)</span>
                  <span className="spx-checkout__price-value">
                    EGP {priceEGP.toFixed(2)}
                  </span>
                </div>
                <div className="spx-checkout__price-total">
                  <span className="spx-checkout__total-label">Total</span>
                  <span className="spx-checkout__total-value">
                    EGP {priceEGP.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Exchange Rate Note */}
              <div className="spx-checkout__exchange-note">
                💱 Exchange rate: $1 USD = {USD_TO_EGP_RATE} EGP
              </div>
            </div>

            {/* Billing Info (if logged in) */}
            {user && (
              <div className="spx-checkout__card">
                <h3 className="spx-checkout__card-title">
                  Billing Information
                </h3>
                <div className="spx-checkout__billing">
                  <div className="spx-checkout__billing-item">
                    <div className="spx-checkout__billing-label">Name</div>
                    <div className="spx-checkout__billing-value">
                      {user.name || "Not provided"}
                    </div>
                  </div>
                  <div className="spx-checkout__billing-item">
                    <div className="spx-checkout__billing-label">Email</div>
                    <div className="spx-checkout__billing-value">
                      {user.email}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Button */}
            <button
              onClick={startPayment}
              disabled={loading}
              className={`spx-checkout__btn spx-checkout__btn--pay ${
                loading ? "is-loading" : ""
              }`}
            >
              {loading ? (
                <span className="spx-checkout__btn-loading">
                  <span className="spx-checkout__spinner spx-checkout__spinner--small"></span>
                  Processing...
                </span>
              ) : (
                `Pay EGP ${priceEGP.toFixed(2)}`
              )}
            </button>

            {/* Footer */}
            <div className="spx-checkout__footer">
              <div className="spx-checkout__security">
                🔒 Secured by Paymob payment gateway
              </div>
              <Link href="/packages" className="spx-checkout__back-link">
                ← Back to packages
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
