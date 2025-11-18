"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { me } from "@/lib/auth";
import "@/styles/checkout.scss";
import { useToast } from "@/components/ToastProvider";

export default function CheckoutPage() {
  const { toast, confirmModal } = useToast();
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

      if (!user) {
        const shouldLogin = await confirmModal(
          "Please log in to continue with checkout. Redirect to login page?"
        );
        if (shouldLogin) {
          const currentUrl = encodeURIComponent(window.location.href);
          router.push(`/login?next=${currentUrl}`);
        }
        return;
      }

      const USD_TO_EGP_RATE = 50;
      const amountEGP = pkg.priceUSD * USD_TO_EGP_RATE;
      const amountCents = Math.round(amountEGP * 100);

      const nameParts = (user.name || "User").split(" ");
      const firstName = nameParts[0] || "User";
      const lastName = nameParts.slice(1).join(" ") || "";

      const body = {
        amountCents,
        orderId: `order_${Date.now()}_${pkg.id}_user${user.id}`,
        packageId: Number(pkg.id),
        currency: "EGP",
        customer: {
          firstName,
          lastName,
          email: user.email || "user@example.com",
          phone: user.phone || "01000000000",
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
      toast.error(e.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  // Show loading while fetching user and package
  if (loadingPkg || loadingUser) {
    return (
      <div className="checkout__loading">
        <div className="checkout__loading-content">
          <div className="checkout__loading-spinner"></div>
          <p className="checkout__loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  // Package not found
  if (!pkg) {
    return (
      <div className="checkout__error">
        <div className="checkout__error-content">
          <h1 className="checkout__error-title">Package not found</h1>
          <p className="checkout__error-message">
            The package you selected could not be found.
          </p>
          <button
            onClick={() => router.push("/packages")}
            className="checkout__error-button"
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
    <div className="checkout">
      <div className="checkout__container">
        {/* Header with User Info */}
        <div className="checkout__header">
          <h1 className="checkout__header-title">Checkout</h1>
          {user && (
            <div className="checkout__header-user">
              Logged in as <strong>{user.email}</strong>
            </div>
          )}
        </div>

        {/* Login Warning (if not logged in) */}
        {!user && (
          <div className="checkout__warning">
            <div className="checkout__warning-content">
              <svg
                className="checkout__warning-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="checkout__warning-text">
                <h3>Login required</h3>
                <p>You'll be prompted to log in before payment.</p>
              </div>
            </div>
          </div>
        )}

        {/* Package Summary */}
        <div className="checkout__package">
          <h2 className="checkout__package-title">{pkg.title}</h2>
          <p className="checkout__package-description">{pkg.description}</p>

          {/* Package Details */}
          <div className="checkout__details">
            {pkg.sessionsPerPack && (
              <div className="checkout__details-row">
                <span className="checkout__details-label">Sessions:</span>
                <span className="checkout__details-value">
                  {pkg.sessionsPerPack}
                </span>
              </div>
            )}
            {pkg.durationMin && (
              <div className="checkout__details-row">
                <span className="checkout__details-label">
                  Duration per session:
                </span>
                <span className="checkout__details-value">
                  {pkg.durationMin} min
                </span>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="checkout__pricing">
            <div className="checkout__pricing-row">
              <span className="checkout__pricing-label">
                Package Price (USD):
              </span>
              <span className="checkout__pricing-value">${pkg.priceUSD}</span>
            </div>
            <div className="checkout__pricing-row">
              <span className="checkout__pricing-label">Price (EGP):</span>
              <span className="checkout__pricing-value">
                EGP {priceEGP.toFixed(2)}
              </span>
            </div>
            <div className="checkout__pricing-row checkout__pricing-row--total">
              <span className="checkout__pricing-label checkout__pricing-label--total">
                Total:
              </span>
              <span className="checkout__pricing-value checkout__pricing-value--total">
                EGP {priceEGP.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Exchange Rate Note */}
          <div className="checkout__exchange-note">
            💱 Exchange rate: $1 USD = {USD_TO_EGP_RATE} EGP
          </div>
        </div>

        {/* Customer Information Preview (if logged in) */}
        {user && (
          <div className="checkout__customer">
            <h3 className="checkout__customer-title">Billing Information</h3>
            <div className="checkout__customer-info">
              <div className="checkout__customer-row">
                <span className="checkout__customer-label">Name:</span>
                <span className="checkout__customer-value">
                  {user.name || "Not provided"}
                </span>
              </div>
              <div className="checkout__customer-row">
                <span className="checkout__customer-label">Email:</span>
                <span className="checkout__customer-value">{user.email}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Button */}
        <button
          onClick={startPayment}
          disabled={loading}
          className="checkout__pay-button"
        >
          {loading ? (
            <span className="checkout__pay-button-loading">
              <span className="checkout__pay-button-spinner"></span>
              Processing...
            </span>
          ) : (
            `Pay EGP ${priceEGP.toFixed(2)}`
          )}
        </button>

        {/* Security Note */}
        <div className="checkout__security">
          🔒 Secured by Paymob payment gateway
        </div>

        {/* Back Link */}
        <div className="checkout__back">
          <button onClick={() => router.push("/packages")}>
            ← Back to packages
          </button>
        </div>
      </div>
    </div>
  );
}
