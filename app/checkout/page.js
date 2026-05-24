"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";
import { me } from "@/lib/auth";
import "@/styles/checkout.scss";
import { useToast } from "@/components/ToastProvider";
import { getDictionary, t } from "@/app/i18n";
import { detectUserCountry } from "@/lib/geo";
import { oneOnOnePlans, groupPlans } from "@/lib/plans";
import {
  calculatePackagePrice,
  formatRegionalPrice,
  formatEgpCharge,
} from "@/lib/regional-pricing";
import {
  buildOrderId,
  buildPriceVerification,
  egpAmountsAgree,
} from "@/lib/payment-contract";
import {
  getNetworkProfile,
  subscribeToNetworkProfileChanges,
} from "@/lib/network-profile";
import { APP_ROUTES, routeHref } from "@/lib/routes";

// When geo detection fails, default to Egypt — we are an Egyptian company
// and EGP is what Paymob processes anyway. This means the worst-case
// fallback shows correct EGP pricing rather than a wrong USD multiplier.
const SAFE_DEFAULT_COUNTRY = "EG";

// Maximum time we wait for geo detection before falling back to the safe
// default. After this, the user can still pay; we just stop waiting.
const GEO_TIMEOUT_MS = 4000;

export default function CheckoutPage() {
  const { toast, confirmModal } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const locale = pathname && pathname.startsWith("/ar") ? "ar" : "en";
  const dict = useMemo(() => getDictionary(locale, "checkout"), [locale]);

  const [pkg, setPkg] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPkg, setLoadingPkg] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);

  const [countryCode, setCountryCode] = useState(null);
  const [geoResolved, setGeoResolved] = useState(false);
  const [geoFailed, setGeoFailed] = useState(false);

  const [discountCode, setDiscountCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountLoading, setDiscountLoading] = useState(false);

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

  // Geo detection with a hard timeout. If the network is slow or geo
  // services are unreachable, we still let the user check out — but with
  // the safe default country code instead of `null`.
  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    (async () => {
      const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve("__timeout__"), GEO_TIMEOUT_MS);
      });

      try {
        const result = await Promise.race([
          detectUserCountry(),
          timeoutPromise,
        ]);

        if (cancelled) return;

        if (result === "__timeout__" || !result) {
          setCountryCode(SAFE_DEFAULT_COUNTRY);
          setGeoFailed(true);
        } else {
          setCountryCode(result);
        }
      } catch {
        if (cancelled) return;
        setCountryCode(SAFE_DEFAULT_COUNTRY);
        setGeoFailed(true);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (!cancelled) setGeoResolved(true);
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
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

  // Fetch package details.
  //
  // lib/plans.js is the canonical source of truth for prices, titles,
  // descriptions, and features. The backend /api/packages endpoint exists
  // only so we can get the numeric `id` that the payment API requires.
  // We MERGE: local plan content + backend numeric id.
  useEffect(() => {
    if (!planIdParam && !planTitleParam) {
      setLoadingPkg(false);
      return;
    }

    (async () => {
      try {
        // 1) Find the canonical plan from lib/plans.js
        const allLocalPlans = [...oneOnOnePlans, ...groupPlans];
        let localPlan = null;

        if (planIdParam) {
          localPlan = allLocalPlans.find((p) => p.id === planIdParam) || null;
        }
        if (!localPlan && planTitleParam) {
          const decodedTitle = decodeURIComponent(planTitleParam).trim().toLowerCase();
          localPlan = allLocalPlans.find(
            (p) => p.title.toLowerCase() === decodedTitle
          ) || null;
        }

        // 2) Fetch backend packages to get the numeric id we send to the
        //    payment API.
        const res = await api.get("/api/packages?audience=INDIVIDUAL");
        const packages = Array.isArray(res.data) ? res.data : [];

        // Match the backend package by the local plan's title (the
        // English/backend title used as the stable matching key). Fall
        // back to the URL title param if no local plan matched.
        const matchTitle = (localPlan?.title || decodeURIComponent(planTitleParam || "")).trim().toLowerCase();
        const backendPkg = matchTitle
          ? packages.find((p) => String(p.title || "").toLowerCase() === matchTitle)
          : null;

        if (localPlan && backendPkg) {
          // Loud diagnostic so we can see exactly what the backend has
          // for this package vs. what plans.js says. If these diverge,
          // Paymob will be charged the backend's number unless the
          // server honors priceVerification.
          const backendEgp = backendPkg.priceEGP ?? backendPkg.priceUSD ?? null;
          if (backendEgp != null && Number(backendEgp) !== Number(localPlan.priceEGP)) {
            // eslint-disable-next-line no-console
            console.warn(
              `[checkout] PRICE DIVERGENCE — plans.js says ${localPlan.title} = ${localPlan.priceEGP} EGP, ` +
              `backend (id=${backendPkg.id}) has ${backendEgp}. ` +
              `Run /admin/packages → "Sync from plans.js" to fix.`
            );
          } else {
            // eslint-disable-next-line no-console
            console.log(
              `[checkout] price ok — ${localPlan.title} = ${localPlan.priceEGP} EGP (backend id=${backendPkg.id} agrees)`
            );
          }

          // Merge: local content wins, backend supplies numeric id only.
          setPkg({
            ...localPlan,
            id: backendPkg.id,
            // Preserve any backend-only fields (image, etc.) WITHOUT
            // letting backend override our prices.
            image: backendPkg.image,
          });
        } else if (localPlan) {
          // Backend doesn't have this plan yet (or fetch failed). We
          // still know what to show, but can't create a payment intent
          // without a numeric id.
          setPkg({ ...localPlan, id: null });
        } else if (backendPkg) {
          // Unknown legacy plan — use whatever the backend returned.
          setPkg(backendPkg);
        } else {
          setPkg(null);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load package:", err);
        setPkg(null);
      } finally {
        setLoadingPkg(false);
      }
    })();
  }, [planIdParam, planTitleParam]);

  // Apply discount code
  async function applyDiscount() {
    if (!discountCode) return;

    try {
      setDiscountLoading(true);
      const res = await api.post("/discounts/validate", { code: discountCode });
      setDiscountPercent(res.data.percentage);
      toast.success(
        t(dict, "discount_toast_applied", { percent: res.data.percentage })
      );
    } catch {
      setDiscountPercent(0);
      toast.error(t(dict, "discount_toast_invalid"));
    } finally {
      setDiscountLoading(false);
    }
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

      window.location.href = data.iframeUrl;
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

  // Frontend-computed regional pricing. This is what's shown on screen
  // AND what we send to the backend in the priceVerification block so
  // the backend can detect a disagreement and reject the intent rather
  // than silently charge a different amount.
  const regionalPrice = useMemo(() => {
    if (!pkg || !geoResolved) return null;
    return calculatePackagePrice(pkg, countryCode, discountPercent);
  }, [pkg, countryCode, discountPercent, geoResolved]);

  // Create the payment intent on the backend. The response includes the
  // locked EGP amount that will actually be charged at Paymob. We show
  // that to the user on a confirmation card before redirecting.
  async function reviewPayment() {
    if (!pkg) return;
    if (!geoResolved) return; // hard guard — never submit with null country
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
        countryCode: countryCode || SAFE_DEFAULT_COUNTRY,
        discountCode: discountCode || null,
        customer: {
          firstName,
          lastName,
          email: user.email || "user@example.com",
          phone: user.phone || "01000000000",
        },
      };

      // priceVerification is the recommended new field documented in
      // lib/payment-contract.js. Until the backend explicitly supports
      // it, we send it under a feature flag so it cannot break strict
      // schema validation. Enable by setting NEXT_PUBLIC_PAYMENT_PRICE_VERIFY=1.
      if (process.env.NEXT_PUBLIC_PAYMENT_PRICE_VERIFY === "1") {
        body.priceVerification = buildPriceVerification(regionalPrice);
      }

      // eslint-disable-next-line no-console
      console.log("[checkout] POST /payments/create-intent", body);

      const { data } = await api.post("/payments/create-intent", body);

      // eslint-disable-next-line no-console
      console.log("[checkout] create-intent response", data);

      if (!data?.ok) {
        // Backend returned a structured failure. Surface the most useful
        // error to the user.
        if (data?.code === "PRICE_MISMATCH" && data?.expectedEgpAmount) {
          // Backend disagrees with our EGP amount. Show the actual amount
          // and let the user opt in to the corrected price.
          const shouldContinue = await confirmModal(
            t(dict, "price_mismatch_message", {
              shown: formatEgpCharge(regionalPrice.egpAmount, locale),
              actual: formatEgpCharge(data.expectedEgpAmount, locale),
            })
          );
          if (shouldContinue && data.iframeUrl) {
            setPendingIntent({
              iframeUrl: data.iframeUrl,
              chargeAmountEGP: data.expectedEgpAmount,
              chargeCurrency: "EGP",
            });
          }
          return;
        }
        throw new Error(data?.message || "Failed to init payment");
      }

      // Successful intent — show the confirmation card with the locked
      // EGP amount. We always show the backend's amount if it sent one
      // (that's what Paymob will actually charge); otherwise we fall
      // back to our client-computed value.
      const backendEgp = Number.isFinite(Number(data.chargeAmountEGP))
        ? Number(data.chargeAmountEGP)
        : null;
      const lockedEgp = backendEgp ?? regionalPrice.egpAmount;
      const expectedEgp = regionalPrice.egpAmount;
      const mismatch =
        backendEgp != null && !egpAmountsAgree(backendEgp, expectedEgp);

      if (mismatch) {
        // eslint-disable-next-line no-console
        console.warn(
          `[checkout] EGP amount mismatch — frontend expected ${expectedEgp}, backend will charge ${backendEgp}`
        );
      }

      setPendingIntent({
        iframeUrl: data.iframeUrl,
        chargeAmountEGP: lockedEgp,
        chargeCurrency: data.chargeCurrency || "EGP",
        // For the warning banner — the amount we showed on the page,
        // and a flag that the user explicitly accepted the mismatch.
        expectedEgpAmount: expectedEgp,
        mismatch,
        accepted: !mismatch, // no acceptance needed when amounts agree
      });
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
    if (!pendingIntent?.iframeUrl) return;
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
  if (!geoResolved || !regionalPrice) {
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
              onChange={(e) => setDiscountCode(e.target.value)}
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
            disabled={loading}
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
