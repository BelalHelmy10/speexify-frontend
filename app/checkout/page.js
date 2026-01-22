"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";
import { me } from "@/lib/auth";
import "@/styles/checkout.scss";
import { useToast } from "@/components/ToastProvider";
import { getDictionary, t } from "@/app/i18n";
import { detectUserCountry } from "@/lib/geo";
import {
  calculatePackagePrice,
  formatRegionalPrice,
} from "@/lib/regional-pricing";
import { getRateFromTo } from "@/lib/currency";

export default function CheckoutPage() {
  const { toast, confirmModal } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Locale & dictionary
  const locale = pathname && pathname.startsWith("/ar") ? "ar" : "en";
  const dict = useMemo(() => getDictionary(locale, "checkout"), [locale]);

  const [pkg, setPkg] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPkg, setLoadingPkg] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);
  const [countryCode, setCountryCode] = useState(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountLoading, setDiscountLoading] = useState(false);

  // New state for realtime EGP equivalent
  const [realtimeEGP, setRealtimeEGP] = useState(null);

  const planTitle = searchParams.get("plan");

  // Detect country
  useEffect(() => {
    (async () => {
      const detected = await detectUserCountry();
      setCountryCode(detected);
      console.log("🌍 Checkout - detected country:", detected || "DEFAULT");
    })();
  }, []);

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
          packages.map((p) => p.title),
        );

        const decodedTitle = decodeURIComponent(planTitle).trim();

        let selected = packages.find(
          (p) => p.title.toLowerCase() === decodedTitle.toLowerCase(),
        );

        if (!selected) {
          selected = packages.find(
            (p) =>
              p.title.toLowerCase().includes(decodedTitle.toLowerCase()) ||
              decodedTitle.toLowerCase().includes(p.title.toLowerCase()),
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

  // Apply discount code
  async function applyDiscount() {
    if (!discountCode) return;

    try {
      setDiscountLoading(true);

      const res = await api.post("/discounts/validate", {
        code: discountCode,
      });

      setDiscountPercent(res.data.percentage);
      toast.success(`-${res.data.percentage}% applied`);
    } catch (e) {
      setDiscountPercent(0);
      toast.error("Invalid discount code");
    } finally {
      setDiscountLoading(false);
    }
  }

  // Calculate regional pricing
  const regionalPrice = useMemo(() => {
    if (!pkg) return null;
    return calculatePackagePrice(pkg, countryCode, discountPercent);
  }, [pkg, countryCode, discountPercent]);

  // Effect to calculate Realtime EGP if currency is not EGP
  useEffect(() => {
    if (!regionalPrice || regionalPrice.displayCurrency === "EGP") {
      setRealtimeEGP(null);
      return;
    }

    (async () => {
      const rate = await getRateFromTo(regionalPrice.displayCurrency, "EGP");
      // Calculate EGP based on the DISPLAY PRICE (which is what user sees)
      const converted = Math.round(regionalPrice.displayAmount * rate);
      console.log(
        `💱 Realtime FX: ${regionalPrice.displayAmount} ${regionalPrice.displayCurrency} * ${rate} = ${converted} EGP`,
      );
      setRealtimeEGP(converted);
    })();
  }, [regionalPrice]);

  async function startPayment() {
    if (!pkg) return;

    try {
      setLoading(true);

      if (!user) {
        const shouldLogin = await confirmModal(
          t(dict, "confirm_login_message"),
        );
        if (shouldLogin) {
          const currentUrl = encodeURIComponent(window.location.href);
          const loginPath = locale === "ar" ? "/ar/login" : "/login";
          router.push(`${loginPath}?next=${currentUrl}`);
        }
        return;
      }

      // Determine final EGP amount for payment
      let finalAmountCents;

      if (realtimeEGP) {
        finalAmountCents = Math.round(realtimeEGP * 100);
      } else {
        // Use the calculated regional amount (which handles overrides and discounts)
        finalAmountCents = Math.round(regionalPrice.egpAmount * 100);
      }

      const nameParts = (user.name || "User").split(" ");
      const firstName = nameParts[0] || "User";
      const lastName = nameParts.slice(1).join(" ") || "";

      const body = {
        amountCents: finalAmountCents,
        orderId: `order_${Date.now()}_${pkg.id}_user${user.id}`,
        packageId: Number(pkg.id),
        currency: "EGP", // Intention API usually expects EGP
        discountCode: discountCode || null,
        customer: {
          firstName,
          lastName,
          email: user.email || "user@example.com",
          phone: user.phone || "01000000000",
        },
      };

      // Call our new Intention API endpoint
      const { data } = await api.post("/payments/create-intent", body);

      if (!data?.ok) {
        throw new Error(data?.message || "Failed to init payment");
      }

      // REDIRECT to Paymob Unified Checkout
      if (data.iframeUrl) {
        window.location.href = data.iframeUrl;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (e) {
      console.error("startPayment error:", e);
      const resp = e?.response?.data;

      if (resp?.code === "ALREADY_SUBSCRIBED") {
        toast.error(t(dict, "toast_already_subscribed"));
      } else if (resp?.message) {
        toast.error(resp.message);
      } else {
        toast.error(t(dict, "toast_payment_failed"));
      }
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
          <p className="checkout__loading-text">{t(dict, "loading_text")}</p>
        </div>
      </div>
    );
  }

  // Package not found
  if (!pkg) {
    return (
      <div className="checkout__error">
        <div className="checkout__error-content">
          <h1 className="checkout__error-title">
            {t(dict, "error_title_not_found")}
          </h1>
          <p className="checkout__error-message">
            {t(dict, "error_message_not_found")}
          </p>
          <button
            onClick={() =>
              router.push(locale === "ar" ? "/ar/packages" : "/packages")
            }
            className="checkout__error-button"
          >
            {t(dict, "error_button_view_packages")}
          </button>
        </div>
      </div>
    );
  }

  // Format prices for display
  // Use regionalPrice calculated in memo above
  if (!regionalPrice) return null; // Logic check

  const displayPrice = formatRegionalPrice(regionalPrice, locale);

  // EGP Price for display (what we will charge)
  // If realtimeEGP is available, use it. Else use standard calc.
  let displayEGPAmount = 0;
  if (realtimeEGP) {
    displayEGPAmount = realtimeEGP;
  } else {
    // Fallback logic
    const base = pkg.priceEGP || pkg.priceUSD || 0;
    displayEGPAmount =
      discountPercent > 0
        ? Math.round(base * (1 - discountPercent / 100))
        : base;
  }

  const egpPrice = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(displayEGPAmount);

  // Check if user is seeing a different currency than EGP
  const isDifferentCurrency = regionalPrice.displayCurrency !== "EGP";

  return (
    <div className="checkout">
      <div className="checkout__container">
        {/* Header with User Info */}
        <div className="checkout__header">
          <h1 className="checkout__header-title">{t(dict, "header_title")}</h1>
          {user && (
            <div className="checkout__header-user">
              {t(dict, "header_logged_in_as")} <strong>{user.email}</strong>
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
                <h3>{t(dict, "warning_title_login_required")}</h3>
                <p>{t(dict, "warning_body_login_required")}</p>
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
                <span className="checkout__details-label">
                  {t(dict, "details_label_sessions")}
                </span>
                <span className="checkout__details-value">
                  {pkg.sessionsPerPack}
                </span>
              </div>
            )}
            {pkg.durationMin && (
              <div className="checkout__details-row">
                <span className="checkout__details-label">
                  {t(dict, "details_label_duration")}
                </span>
                <span className="checkout__details-value">
                  {pkg.durationMin} {t(dict, "details_duration_unit")}
                </span>
              </div>
            )}
          </div>

          {/* Discount Code */}
          <div className="checkout__discount">
            <input
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="Discount code"
            />
            <button onClick={applyDiscount} disabled={discountLoading}>
              Apply
            </button>

            {discountPercent > 0 && (
              <div className="checkout__discount-applied">
                Discount applied: {discountPercent}%
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="checkout__pricing">
            <div className="checkout__pricing-row">
              <span className="checkout__pricing-label">
                {t(dict, "pricing_label_package_price")}
              </span>
              <span className="checkout__pricing-value">{displayPrice}</span>
            </div>

            {/* Show EGP equivalent if different currency */}
            {isDifferentCurrency && (
              <div className="checkout__pricing-row">
                <span className="checkout__pricing-label">
                  {t(dict, "pricing_label_egp_equivalent")}
                </span>
                <span className="checkout__pricing-value">{egpPrice}</span>
              </div>
            )}

            <div className="checkout__pricing-row checkout__pricing-row--total">
              <span className="checkout__pricing-label checkout__pricing-label--total">
                {t(dict, "pricing_label_total")}
              </span>
              <span className="checkout__pricing-value checkout__pricing-value--total">
                {displayPrice}
              </span>
            </div>
          </div>

          {/* Exchange Rate Note - only show if different currency */}
          {isDifferentCurrency && (
            <div className="checkout__exchange-note">
              {t(dict, "exchange_note_regional", {
                displayCurrency: regionalPrice.displayCurrency,
                region: regionalPrice.regionName,
              })}
            </div>
          )}
        </div>

        {/* Customer Information Preview (if logged in) */}
        {user && (
          <div className="checkout__customer">
            <h3 className="checkout__customer-title">
              {t(dict, "customer_title_billing_info")}
            </h3>
            <div className="checkout__customer-info">
              <div className="checkout__customer-row">
                <span className="checkout__customer-label">
                  {t(dict, "customer_label_name")}
                </span>
                <span className="checkout__customer-value">
                  {user.name || t(dict, "customer_value_name_missing")}
                </span>
              </div>
              <div className="checkout__customer-row">
                <span className="checkout__customer-label">
                  {t(dict, "customer_label_email")}
                </span>
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
              {t(dict, "pay_button_processing")}
            </span>
          ) : (
            <>
              {t(dict, "pay_button_label")} {displayPrice}
            </>
          )}
        </button>

        {/* Security Note */}
        <div className="checkout__security">{t(dict, "security_note")}</div>

        {/* Back Link */}
        <div className="checkout__back">
          <button
            onClick={() =>
              router.push(locale === "ar" ? "/ar/packages" : "/packages")
            }
          >
            {t(dict, "back_to_packages")}
          </button>
        </div>
      </div>
    </div>
  );
}
