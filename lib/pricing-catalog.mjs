const DEFAULT_TIMEOUT_MS = 15_000;

export function isValidPackageId(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function isValidPricingCatalog(catalog) {
  if (
    !catalog ||
    typeof catalog !== "object" ||
    typeof catalog.regionToken !== "string" ||
    !catalog.regionToken.trim() ||
    !Array.isArray(catalog.packages) ||
    catalog.packages.length === 0
  ) {
    return false;
  }

  const packageIds = new Set();
  const catalogKeys = new Set();

  return catalog.packages.every((pkg) => {
    const catalogKey = typeof pkg?.catalogKey === "string" ? pkg.catalogKey.trim() : "";
    const pricing = pkg?.pricing;

    if (
      !isValidPackageId(pkg?.id) ||
      !catalogKey ||
      packageIds.has(pkg.id) ||
      catalogKeys.has(catalogKey) ||
      !pricing ||
      typeof pricing !== "object" ||
      !Number.isSafeInteger(pricing.displayAmount) ||
      pricing.displayAmount <= 0 ||
      typeof pricing.displayCurrency !== "string" ||
      !pricing.displayCurrency.trim()
    ) {
      return false;
    }

    packageIds.add(pkg.id);
    catalogKeys.add(catalogKey);
    return true;
  });
}

export function isPurchaseReadyPlan(plan, catalog) {
  if (
    !isValidPricingCatalog(catalog) ||
    !isValidPackageId(plan?.backendId) ||
    typeof plan?.regionToken !== "string" ||
    plan.regionToken !== catalog.regionToken
  ) {
    return false;
  }

  return catalog.packages.some((pkg) => pkg.id === plan.backendId);
}

function createCatalogError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function fetchPricingCatalogData(request, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (typeof request !== "function") {
    throw createCatalogError("Pricing catalog request is unavailable.", "PRICING_CATALOG_REQUEST");
  }

  let timer;
  try {
    const response = await Promise.race([
      Promise.resolve().then(() => request()),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(createCatalogError("Pricing catalog request timed out.", "PRICING_CATALOG_TIMEOUT"));
        }, timeoutMs);
      }),
    ]);
    const data = response?.data ?? response;

    if (!isValidPricingCatalog(data)) {
      throw createCatalogError("Prices are temporarily unavailable.", "PRICING_CATALOG_INVALID");
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}
