// lib/regional-pricing.js

import { PRICING_REGIONS, getPricingRegion } from "./pricing-regions";

/**
 * Calculate regional price from base EGP price
 *
 * @param {number} baseEGP - Base price in Egyptian Pounds
 * @param {string} countryCode - ISO country code (e.g., 'EG', 'US', 'GB')
 * @returns {object} - Pricing information
 */
export function calculateRegionalPrice(baseEGP, countryCode, options = {}) {
  // Get the pricing config for this country
  const region = getPricingRegion(countryCode);

  // If the input is already the regional currency amount (override use-case),
  // do NOT apply multiplier again.
  const isAlreadyRegional = options.baseCurrency === region.currency;

  // Calculate the regional price
  const regionalPrice = isAlreadyRegional
    ? Math.round(baseEGP)
    : Math.round(baseEGP * region.multiplier);

  return {
    // The price to display to the user in their local currency
    displayAmount: regionalPrice,
    displayCurrency: region.currency,

    // The actual EGP amount for Paymob payment (always needed)
    egpAmount: options.egpAmount ?? baseEGP,

    // Metadata
    countryCode: countryCode || "DEFAULT",
    regionName: region.name,
    multiplier: isAlreadyRegional ? 1 : region.multiplier,

    // For debugging
    calculation: isAlreadyRegional
      ? `${baseEGP} ${region.currency} (override) = ${regionalPrice} ${region.currency}`
      : `${baseEGP} EGP × ${region.multiplier} = ${regionalPrice} ${region.currency}`,
  };
}

/**
 * Calculate regional price for an entire package
 * Handles both priceEGP and legacy priceUSD fields
 */
export function calculatePackagePrice(pkg, countryCode) {
  const cc = (countryCode || "").toUpperCase();

  // ✅ 1) PLAN OVERRIDE (if exists)
  const override = pkg?.pricingOverrides?.[cc];
  if (override?.total && override?.currency) {
    // We pass baseCurrency=override.currency so calculateRegionalPrice doesn't multiply again
    return calculateRegionalPrice(override.total, cc, {
      baseCurrency: override.currency,
      egpAmount: pkg.priceEGP || pkg.priceUSD || 0,
    });
  }

  // ✅ 2) Normal flow: base EGP
  const baseEGP = pkg.priceEGP || pkg.priceUSD || 0;

  if (baseEGP === 0) {
    return {
      displayAmount: 0,
      displayCurrency: "EGP",
      egpAmount: 0,
      isCustomPricing: true,
    };
  }

  return calculateRegionalPrice(baseEGP, cc);
}

/**
 * Calculate per-session price
 */
export function calculatePerSessionPrice(pkg, countryCode) {
  if (!pkg.sessionsPerPack) return null;

  const cc = (countryCode || "").toUpperCase();

  // ✅ 1) PLAN OVERRIDE
  const override = pkg?.pricingOverrides?.[cc];
  if (override?.total && override?.currency) {
    const perSession = override.total / pkg.sessionsPerPack;
    return calculateRegionalPrice(perSession, cc, {
      baseCurrency: override.currency,
      egpAmount: (pkg.priceEGP || pkg.priceUSD || 0) / pkg.sessionsPerPack,
    });
  }

  // ✅ 2) Normal flow
  const baseEGP = pkg.priceEGP || pkg.priceUSD || 0;
  const perSessionEGP = baseEGP / pkg.sessionsPerPack;

  return calculateRegionalPrice(perSessionEGP, cc);
}

/**
 * Format price for display with currency symbol
 */
export function formatRegionalPrice(priceData, locale = "en") {
  const { displayAmount, displayCurrency } = priceData;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: displayCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(displayAmount);
  } catch (error) {
    // Fallback if currency formatting fails
    return `${displayAmount} ${displayCurrency}`;
  }
}
