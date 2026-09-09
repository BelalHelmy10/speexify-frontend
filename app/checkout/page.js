"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";
import { me } from "@/lib/auth";
import "@/styles/checkout.scss";
import { useToast } from "@/components/ToastProvider";
import { getDictionary, t } from "@/app/i18n";
import { usePricingCatalog, useCheckoutQuote } from "@/hooks/usePricingCatalog";
import { oneOnOnePlans, groupPlans } from "@/lib/plans";
import {
  formatRegionalPrice,
  formatEgpCharge,
} from "@/lib/regional-pricing";
import {
  buildOrderId,
  confirmationFromResponse,
} from "@/lib/payment-contract";
import {
  getNetworkProfile,
  subscribeToNetworkProfileChanges,
} from "@/lib/network-profile";
import { APP_ROUTES, routeHref } from "@/lib/routes";

export default function CheckoutPage() {
  const { toast, confirmModal } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const locale = pathname && pathname.startsWith("/ar") ? "ar" : "en";
  const dict = useMemo(() => getDictionary(locale, "checkout"), [locale]);

  const {catalog, error: catalogError, retry: retryCatalog} = usePricingCatalog();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const [loadingUser, setLoadingUser] = useState(true);

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState("");

  const [networkProfile, setNetworkProfile] = useState(() => getNetworkProfile());
  const [recoveryOrder, setRecoveryOrder] = useState(null);
  const [recoveringOrderId, setRecoveringOrderId] = useState(null);

  // Confirmation step state — populated after a successful create-intent.
  // While this is set, the user sees a confirmation card with the locked
  // EGP charge amount before being redirected to Paymob.
  const [pendingIntent, setPendingIntent] = useState(null);

  // Stable orderId timestamp for the current attempt. We capture this
  // when the user first clicks "Review" and reuse it for retries within
  // the same attempt, so double-clicks don't create duplicate intents.
  // It resets when the user cancels the confirmation card.
  const orderTimestampRef = useRef(null);

  // Accept either ?planId= (preferred) or ?plan= (legacy, by title).
  const planIdParam = searchParams.get("planId");
  const planTitleParam = searchParams.get("plan");

  useEffect(() => {
    return subscribeToNetworkProfileChanges((nextProfile) => {
      setNetworkProfile(nextProfile);
    });
  }, []);

  // Fetch current user
  useEffect(() => {
    (async () => {
      try {
        const userData = await me();
        setUser(userData?.user || null);
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  const pkg = useMemo(() => {
    if (!catalog) return null;
    const numericId = Number(searchParams.get("packageId"));
    const editorial = [...oneOnOnePlans, ...groupPlans].find(p =>
      p.id === planIdParam || p.title.toLowerCase() === (planTitleParam || "").trim().toLowerCase());
    const item = numericId ? catalog.packages.find(p => p.id === numericId)
      : catalog.packages.find(p => p.catalogKey === editorial?.id);
    if (!item) return null;
    const content = [...oneOnOnePlans, ...groupPlans].find(p => p.id === item.catalogKey);
    const packageDict = getDictionary(locale, "packages");
    return {...item, title: packageDict[`plan_${item.catalogKey}_title`] || content?.title || item.title,
      description: packageDict[`plan_${item.catalogKey}_desc`] || content?.description || item.description};
  }, [catalog, searchParams, planIdParam, planTitleParam, locale]);
  const regionToken = searchParams.get("region") || catalog?.regionToken;
  const quote = useCheckoutQuote(pkg?.id, regionToken, appliedDiscount);
  const regionalPrice = quote.pricing;
  const discountPercent = regionalPrice?.discountPercentage || 0;
  const discountLoading = quote.loading;
  const loadingPkg = !catalog && !catalogError;
  const geoFailed = catalog?.countrySource === "default";
  function applyDiscount() {
    setPendingIntent(null);
    orderTimestampRef.current = null;
    setAppliedDiscount(discountCode.trim().toUpperCase());
  }

  // Recovery flow — show banner for a pending/failed previous order.
  // We only surface orders from the last 24 hours so stale unfinished
  // attempts from days/weeks ago don't keep nagging the user.
  const RECOVERY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (!user?.id || !pkg?.id) {
      setRecoveryOrder(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get("/api/payments/orders/recovery", {
          params: { packageId: Number(pkg.id), limit: 1 },
        });
        const candidate = data?.items?.[0] || null;

        if (cancelled) return;
        if (!candidate) {
          setRecoveryOrder(null);
          return;
        }

        // Filter out old orders. The backend may not yet enforce this so
        // we double-check on the client.
        const orderTs = Date.parse(candidate.createdAt || candidate.created_at || "");
        if (Number.isFinite(orderTs) && Date.now() - orderTs > RECOVERY_MAX_AGE_MS) {
          setRecoveryOrder(null);
          return;
        }

        setRecoveryOrder(candidate);
      } catch {
        if (!cancelled) setRecoveryOrder(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, pkg?.id]);

  function dismissRecoveryBanner() {
    setRecoveryOrder(null);
  }

  async function resumeRecoverableOrder(orderId) {
    if (!orderId) return;

    try {
      setRecoveringOrderId(orderId);
      const { data } = await api.post(
        `/api/payments/orders/${encodeURIComponent(orderId)}/retry-intent`
      );

      if (!data?.ok || !data?.iframeUrl) {
        throw new Error(data?.error || t(dict, "recovery_retry_failed"));
      }

      setPendingIntent(confirmationFromResponse(data, regionalPrice));
    } catch (e) {
      // Retry failed — the stored intent is unusable (expired, price
      // changed, backend rejected, etc.). Dismiss the banner so the user
      // can start a fresh checkout below rather than being stuck.
      const message =
        e?.response?.data?.error || e?.message || t(dict, "recovery_retry_failed");
      toast.error(message);
      setRecoveryOrder(null);
    } finally {
      setRecoveringOrderId(null);
    }
  }

  // Create the payment intent on the backend. The response includes the
  // locked EGP amount that will actually be charged at Paymob. We show
  // that to the user on a confirmation card before redirecting.
  async function reviewPayment() {
    if (!pkg) return;
    if (!quote.quoteToken) return;
    if (!regionalPrice) return;

    // The backend payment API requires a numeric package id. If the local
    // plan exists but isn't synced to the backend yet, we cannot proceed.
    if (pkg.id == null || Number.isNaN(Number(pkg.id))) {
      toast.error(t(dict, "error_package_not_synced"));
      return;
    }

    if (!user) {
      const shouldLogin = await confirmModal(t(dict, "confirm_login_message"));
      if (shouldLogin) {
        const currentUrl = encodeURIComponent(window.location.href);
        router.push(`${routeHref(APP_ROUTES.login, locale)}?next=${currentUrl}`);
      }
      return;
    }

    try {
      setLoading(true);

      const nameParts = (user.name || "User").split(" ");
      const firstName = nameParts[0] || "User";
      const lastName = nameParts.slice(1).join(" ") || "";

      if (orderTimestampRef.current == null) {
        orderTimestampRef.current = Date.now();
      }

      const body = {
        orderId: buildOrderId({
          userId: user.id,
          packageId: Number(pkg.id),
          timestamp: orderTimestampRef.current,
        }),
        packageId: Number(pkg.id),
        quoteToken: quote.quoteToken,
        discountCode: appliedDiscount || null,
        customer: {
          firstName,
          lastName,
          email: user.email || "user@example.com",
          phone: user.phone || "01000000000",
        },
      };

      const { data } = await api.post("/payments/create-intent", body);

      setPendingIntent(confirmationFromResponse(data, regionalPrice));
    } catch (e) {
      // Log everything we can find about the failure as separate args so
      // dev-tools doesn't collapse it. Also stringify the response for
      // copy-paste sharing.
      // eslint-disable-next-line no-console
      console.error(
        "[checkout] create-intent failed",
        "status:", e?.response?.status,
        "data:", e?.response?.data,
        "message:", e?.message,
        "raw:", JSON.stringify(e?.response?.data ?? null)
      );

      // Failed attempt — reset the orderId timestamp so the next click
      // starts a brand-new order rather than re-sending the same id the
      // backend may have already rejected.
      orderTimestampRef.current = null;

      const resp = e?.response?.data;
      if (["PRICE_CHANGED", "QUOTE_EXPIRED"].includes(resp?.code)) quote.refresh();
      const status = e?.response?.status;

      // Surface the most specific message the backend gave us. If it's
      // a validation error with a "fields" or "details" array, include
      // those so we know which field the backend objected to.
      let detail;
      if (resp?.code === "ALREADY_SUBSCRIBED") {
        detail = t(dict, "toast_already_subscribed");
      } else if (resp?.message) {
        detail = resp.message;
      } else if (resp?.error) {
        const fields = Array.isArray(resp?.fields) ? resp.fields.join(", ")
          : Array.isArray(resp?.details) ? resp.details.map(d => d?.path || d?.field || d?.message).filter(Boolean).join(", ")
          : null;
        detail = fields ? `${resp.error}: ${fields}` : String(resp.error);
      } else if (status) {
        detail = `${t(dict, "toast_payment_failed")} (HTTP ${status})`;
      } else {
        detail = t(dict, "toast_payment_failed");
      }
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  }

  function confirmAndRedirect() {
    if (!pendingIntent?.iframeUrl || !pendingIntent.accepted) return;
    window.location.href = pendingIntent.iframeUrl;
  }

  function cancelConfirmation() {
    // Clear the orderId timestamp so the next "Review" mints a fresh
    // orderId rather than colliding with the abandoned intent.
    orderTimestampRef.current = null;
    setPendingIntent(null);
  }

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

  if (catalogError) return (<div className="checkout__error" role="alert"><p>{locale === "ar" ? "تعذّر تحميل الأسعار." : catalogError}</p><button onClick={retryCatalog}>{locale === "ar" ? "حاول مرة أخرى" : "Try again"}</button></div>);

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
            onClick={() => router.push(routeHref(APP_ROUTES.packages, locale))}
            className="checkout__error-button"
          >
            {t(dict, "error_button_view_packages")}
          </button>
        </div>
      </div>
    );
  }

  // Still waiting on geo resolution — show a friendly loading state so the
  // Pay button never appears with a null countryCode.
  if (quote.error) return (<div className="checkout__error" role="alert">
    <p>{locale === "ar" ? "تعذّر تأكيد السعر أو كود الخصم. حدّث السعر وحاول مرة أخرى." : quote.error}</p>
    <button onClick={() => {setAppliedDiscount(""); setDiscountCode(""); router.replace(`${pathname}?packageId=${pkg.id}`); retryCatalog(); quote.refresh();}}>{locale === "ar" ? "تحديث السعر" : "Refresh price"}</button>
  </div>);

  if (!regionalPrice) {
    return (
      <div className="checkout__loading">
        <div className="checkout__loading-content">
          <div className="checkout__loading-spinner"></div>
          <p className="checkout__loading-text">{t(dict, "geo_loading")}</p>
        </div>
      </div>
    );
  }

  const displayPrice = formatRegionalPrice(regionalPrice, locale);
  const lockedEgpDisplay = pendingIntent
    ? formatEgpCharge(pendingIntent.chargeAmountEGP, locale)
    : null;

  return (
    <div className="checkout">
      <div className="checkout__container">
        <div className="checkout__header">
          <h1 className="checkout__header-title">{t(dict, "header_title")}</h1>
          {user && (
            <div className="checkout__header-user">
              {t(dict, "header_logged_in_as")} <strong>{user.email}</strong>
            </div>
          )}
        </div>

        {geoFailed && (
          <div className="checkout__exchange-note">
            {t(dict, "geo_failed_note")}
          </div>
        )}

        {networkProfile.isLowBandwidth && (
          <div className="checkout__exchange-note">
            {t(dict, "low_bandwidth_note")}
          </div>
        )}

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

        {user && recoveryOrder && (
          <div className="checkout__warning">
            <button
              type="button"
              className="checkout__warning-dismiss"
              onClick={dismissRecoveryBanner}
              aria-label={t(dict, "recovery_dismiss_aria")}
            >
              ×
            </button>
            <div className="checkout__warning-content">
              <svg
                className="checkout__warning-icon"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-12a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0V6zm0 7a.75.75 0 10-1.5 0 .75.75 0 001.5 0z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="checkout__warning-text">
                <h3>{t(dict, "recovery_title")}</h3>
                <p>
                  {t(dict, "recovery_message", { orderId: recoveryOrder.id })}
                </p>
                <div className="checkout__warning-actions">
                  <button
                    type="button"
                    className="checkout__error-button"
                    onClick={() => resumeRecoverableOrder(recoveryOrder.id)}
                    disabled={recoveringOrderId === recoveryOrder.id}
                  >
                    {recoveringOrderId === recoveryOrder.id
                      ? t(dict, "recovery_button_processing")
                      : t(dict, "recovery_button")}
                  </button>
                  <button
                    type="button"
                    className="checkout__warning-secondary"
                    onClick={dismissRecoveryBanner}
                  >
                    {t(dict, "recovery_start_fresh")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="checkout__package">
          <h2 className="checkout__package-title">{pkg.title}</h2>
          <p className="checkout__package-description">{pkg.description}</p>

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

          <div className="checkout__discount">
            <input
              value={discountCode}
              onChange={(e) => {setDiscountCode(e.target.value); setAppliedDiscount(""); setPendingIntent(null); orderTimestampRef.current = null;}}
              placeholder={t(dict, "discount_placeholder")}
            />
            <button onClick={applyDiscount} disabled={discountLoading}>
              {t(dict, "discount_apply")}
            </button>

            {discountPercent > 0 && (
              <div className="checkout__discount-applied">
                {t(dict, "discount_applied", { percent: discountPercent })}
              </div>
            )}
          </div>

          <div className="checkout__pricing">
            <div className="checkout__pricing-row">
              <span className="checkout__pricing-label">
                {t(dict, "pricing_label_package_price")}
              </span>
              <span className="checkout__pricing-value">{displayPrice}</span>
            </div>

            {regionalPrice.displayCurrency !== "EGP" && (
              <div className="checkout__pricing-row">
                <span className="checkout__pricing-label">
                  {t(dict, "pricing_label_egp_equivalent")}
                </span>
                <span className="checkout__pricing-value">
                  {formatEgpCharge(regionalPrice.egpAmount, locale)}
                </span>
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
        </div>

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

        {/* Either the Review button OR the Confirmation card — not both. */}
        {pendingIntent ? (
          <div className="checkout__confirm" role="dialog" aria-live="polite">
            <h3 className="checkout__confirm-title">
              {t(dict, "confirm_title")}
            </h3>

            {pendingIntent.mismatch && (
              <div className="checkout__confirm-mismatch" role="alert">
                <div className="checkout__confirm-mismatch-title">
                  {t(dict, "confirm_mismatch_title")}
                </div>
                <p className="checkout__confirm-mismatch-body">
                  {t(dict, "confirm_mismatch_body", {
                    expected: formatEgpCharge(
                      pendingIntent.expectedEgpAmount,
                      locale
                    ),
                    actual: formatEgpCharge(
                      pendingIntent.chargeAmountEGP,
                      locale
                    ),
                  })}
                </p>
                <label className="checkout__confirm-mismatch-ack">
                  <input
                    type="checkbox"
                    checked={pendingIntent.accepted}
                    onChange={(e) =>
                      setPendingIntent((prev) =>
                        prev ? { ...prev, accepted: e.target.checked } : prev
                      )
                    }
                  />
                  <span>
                    {t(dict, "confirm_mismatch_acknowledge", {
                      amount: formatEgpCharge(
                        pendingIntent.chargeAmountEGP,
                        locale
                      ),
                    })}
                  </span>
                </label>
              </div>
            )}

            <div className="checkout__confirm-amount">
              <div className="checkout__confirm-amount-label">
                {t(dict, "confirm_charge_amount_label")}
              </div>
              <div className="checkout__confirm-amount-value">
                {lockedEgpDisplay}
              </div>
            </div>
            {regionalPrice.displayCurrency !== "EGP" && (
              <p className="checkout__confirm-note">
                {t(dict, "confirm_currency_note", {
                  currency: regionalPrice.displayCurrency,
                })}
              </p>
            )}
            <div className="checkout__confirm-actions">
              <button
                onClick={confirmAndRedirect}
                className="checkout__pay-button"
                disabled={!pendingIntent.accepted}
              >
                {t(dict, "confirm_btn_proceed")}
              </button>
              <button
                onClick={cancelConfirmation}
                className="checkout__confirm-cancel"
                type="button"
              >
                {t(dict, "confirm_btn_cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={reviewPayment}
            disabled={loading || !quote.quoteToken}
            className="checkout__pay-button"
          >
            {loading ? (
              <span className="checkout__pay-button-loading">
                <span className="checkout__pay-button-spinner"></span>
                {t(dict, "pay_button_processing")}
              </span>
            ) : (
              t(dict, "pay_button_review_with_amount", { amount: displayPrice })
            )}
          </button>
        )}

        <div className="checkout__security">{t(dict, "security_note")}</div>

        <div className="checkout__back">
          <button
            onClick={() => router.push(routeHref(APP_ROUTES.packages, locale))}
          >
            {t(dict, "back_to_packages")}
          </button>
        </div>
      </div>
    </div>
  );
}
