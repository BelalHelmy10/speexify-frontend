// lib/regional-pricing.js
//
// Frontend pricing computation. Read this together with payment-contract.js
// before changing — the math here MUST match what the backend uses to create
// Paymob intents, or display and charge will disagree.

import { getPricingRegion } from "./pricing-regions";

// Pull the base EGP value out of a package object. The backend currently
// stores this in a field called `priceUSD` even though the value is in EGP
// (legacy naming — see payment-contract.js). We accept either name but
// prefer the correctly-named `priceEGP` when present.
function resolveBaseEGP(pkg) {
  if (!pkg) return { value: 0, source: "missing", warning: "Package object is null/undefined" };

  if (typeof pkg.priceEGP === "number" && pkg.priceEGP > 0) {
    return { value: pkg.priceEGP, source: "priceEGP" };
  }

  if (typeof pkg.priceUSD === "number" && pkg.priceUSD > 0) {
    // Legacy field. Value is treated as EGP because that is what the admin
    // form actually collects. Log a deprecation warning in development so
    // backend can be migrated.
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        `[pricing] Package "${pkg.title || pkg.id}" uses legacy priceUSD field (value ${pkg.priceUSD} treated as EGP). Migrate backend to priceEGP.`
      );
    }
    return { value: pkg.priceUSD, source: "priceUSD-legacy" };
  }

  return { value: 0, source: "missing", warning: "No priceEGP or priceUSD on package" };
}

// Compute display + charge amounts for a single EGP value.
//
//   baseEGP           number   Base price in EGP.
//   countryCode       string   ISO-3166-1 alpha-2. Falls back to DEFAULT.
//   options.baseCurrency       If the caller is passing an already-converted
//                              amount in `baseEGP` (e.g. a per-country
//                              pricingOverride), set this to that currency to
//                              skip the multiplier.
//   options.egpAmount          Explicit EGP amount to charge via Paymob. If
//                              omitted, defaults to `baseEGP` (which is
//                              correct only when the caller passed real EGP).
export function calculateRegionalPrice(baseEGP, countryCode, options = {}) {
  const region = getPricingRegion(countryCode);
  const isAlreadyRegional = options.baseCurrency === region.currency;

  const regionalPrice = isAlreadyRegional
    ? Math.round(baseEGP)
    : Math.round(baseEGP * region.multiplier);

  return {
    // Display in user's local currency
    displayAmount: regionalPrice,
    displayCurrency: region.currency,

    // EGP amount the backend must use when creating the Paymob intent.
    // Paymob only processes EGP, so this is what the user actually pays.
    egpAmount: options.egpAmount ?? baseEGP,

    countryCode: countryCode || "DEFAULT",
    regionName: region.name,
    multiplier: isAlreadyRegional ? 1 : region.multiplier,

    isMissingPriceData: false,

    // Debug-only — never display to users
    _calculation: isAlreadyRegional
      ? `${baseEGP} ${region.currency} (override) = ${regionalPrice} ${region.currency}`
      : `${baseEGP} EGP × ${region.multiplier} = ${regionalPrice} ${region.currency}`,
  };
}

// Compute display + charge amounts for an entire package, applying any
// per-country override and any discount.
export function calculatePackagePrice(pkg, countryCode, discountPercent = 0) {
  const cc = (countryCode || "").toUpperCase();
  const region = getPricingRegion(cc);

  // 1) Per-country override on the package itself
  const override = pkg?.pricingOverrides?.[cc];
  if (override?.total && override?.currency) {
    const discountedTotal =
      discountPercent > 0
        ? Math.round(override.total * (1 - discountPercent / 100))
        : override.total;

    const { value: baseEGP } = resolveBaseEGP(pkg);
    const discountedEGP = discountPercent > 0
      ? Math.round(baseEGP * (1 - discountPercent / 100))
      : baseEGP;

    return calculateRegionalPrice(discountedTotal, cc, {
      baseCurrency: override.currency,
      // If the override is in EGP we can charge it directly; otherwise the
      // EGP charge must come from the canonical EGP base price (NOT a
      // client-side FX conversion of the override amount).
      egpAmount: override.currency === "EGP" ? discountedTotal : discountedEGP,
    });
  }

  // 2) Normal flow: derive from base EGP
  const { value: rawBaseEGP, source, warning } = resolveBaseEGP(pkg);

  if (rawBaseEGP <= 0) {
    return {
      displayAmount: 0,
      displayCurrency: region.currency,
      egpAmount: 0,
      countryCode: cc || "DEFAULT",
      regionName: region.name,
      multiplier: region.multiplier,
      isCustomPricing: true,
      isMissingPriceData: source === "missing",
      _warning: warning,
    };
  }

  const baseEGP = discountPercent > 0
    ? Math.round(rawBaseEGP * (1 - discountPercent / 100))
    : rawBaseEGP;

  const result = calculateRegionalPrice(baseEGP, cc);
  result._priceSource = source;
  return result;
}

// Per-session price for a package.
export function calculatePerSessionPrice(pkg, countryCode, discountPercent = 0) {
  if (!pkg?.sessionsPerPack || pkg.sessionsPerPack <= 0) return null;

  const cc = (countryCode || "").toUpperCase();
  const override = pkg?.pricingOverrides?.[cc];

  if (override?.total && override?.currency) {
    const discountedTotal =
      discountPercent > 0
        ? Math.round(override.total * (1 - discountPercent / 100))
        : override.total;

    const perSession = discountedTotal / pkg.sessionsPerPack;

    const { value: baseEGP } = resolveBaseEGP(pkg);
    const perSessionEGP = baseEGP / pkg.sessionsPerPack;
    const discountedPerSessionEGP = discountPercent > 0
      ? Math.round(perSessionEGP * (1 - discountPercent / 100))
      : perSessionEGP;

    return calculateRegionalPrice(perSession, cc, {
      baseCurrency: override.currency,
      egpAmount: override.currency === "EGP" ? perSession : discountedPerSessionEGP,
    });
  }

  const { value: baseEGP } = resolveBaseEGP(pkg);
  if (baseEGP <= 0) return null;

  const perSessionEGP = baseEGP / pkg.sessionsPerPack;
  const discountedPerSessionEGP = discountPercent > 0
    ? perSessionEGP * (1 - discountPercent / 100)
    : perSessionEGP;

  return calculateRegionalPrice(discountedPerSessionEGP, cc);
}

// Format a price object for display.
export function formatRegionalPrice(priceData, locale = "en") {
  if (!priceData) return "";
  const { displayAmount, displayCurrency } = priceData;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: displayCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(displayAmount);
  } catch {
    return `${displayAmount} ${displayCurrency}`;
  }
}

// Format the EGP charge amount specifically (always EGP, always shown as
// "X EGP" in the user's locale). Use this on the confirmation step before
// redirecting to Paymob.
export function formatEgpCharge(egpAmount, locale = "en") {
  const amount = Number(egpAmount) || 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} EGP`;
  }
}
