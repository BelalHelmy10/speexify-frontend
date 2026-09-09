// Prices are calculated by the backend. These helpers only select/format
// server values; there is deliberately no client-side regional or FX math.
export function calculatePackagePrice(pkg) {
  if (pkg?.pricing?.displayAmount > 0) return pkg.pricing;
  return {displayAmount: 0, displayCurrency: "EGP", isCustomPricing: true};
}
export function calculatePerSessionPrice(pkg) {
  if (!pkg?.pricing?.displayAmount || !pkg.sessionsPerPack) return null;
  return {...pkg.pricing, displayAmount: Math.round(pkg.pricing.displayAmount / pkg.sessionsPerPack * 100) / 100};
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
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} EGP`;
  }
}
