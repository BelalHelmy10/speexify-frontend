// lib/regional-pricing.js

import { PRICING_REGIONS, getPricingRegion } from "./pricing-regions";

/**
 * Calculate regional price from base EGP price
 *
 * @param {number} baseEGP - Base price in Egyptian Pounds
 * @param {string} countryCode - ISO country code (e.g., 'EG', 'US', 'GB')
 * @returns {object} - Pricing information
 */
export function calculateRegionalPrice(baseEGP, countryCode) {
  // Get the pricing config for this country
  const region = getPricingRegion(countryCode);

  // Calculate the regional price
  const regionalPrice = Math.round(baseEGP * region.multiplier);

  return {
    // The price to display to the user in their local currency
    displayAmount: regionalPrice,
    displayCurrency: region.currency,

    // The actual EGP amount for Paymob payment (always needed)
    egpAmount: baseEGP,

    // Metadata
    countryCode: countryCode || "DEFAULT",
    regionName: region.name,
    multiplier: region.multiplier,

    // For debugging
    calculation: `${baseEGP} EGP × ${region.multiplier} = ${regionalPrice} ${region.currency}`,
  };
}

/**
 * Calculate regional price for an entire package
 * Handles both priceEGP and legacy priceUSD fields
 */
export function calculatePackagePrice(pkg, countryCode) {
  // Get base EGP price (your packages use priceEGP or priceUSD as base)
  const baseEGP = pkg.priceEGP || pkg.priceUSD || 0;

  if (baseEGP === 0) {
    return {
      displayAmount: 0,
      displayCurrency: "EGP",
      egpAmount: 0,
      isCustomPricing: true,
    };
  }

  return calculateRegionalPrice(baseEGP, countryCode);
}

/**
 * Calculate per-session price
 */
export function calculatePerSessionPrice(pkg, countryCode) {
  if (!pkg.sessionsPerPack) return null;

  const baseEGP = pkg.priceEGP || pkg.priceUSD || 0;
  const perSessionEGP = baseEGP / pkg.sessionsPerPack;

  return calculateRegionalPrice(perSessionEGP, countryCode);
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
