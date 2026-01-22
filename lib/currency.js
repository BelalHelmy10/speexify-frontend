const BASE_CURRENCY = "EGP";

// best-effort mapping when geo lookup fails
const REGION_TO_CURRENCY = {
  EG: "EGP",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  NZ: "NZD",
  EU: "EUR",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  TR: "TRY",
  SA: "SAR",
  AE: "AED",
  QA: "QAR",
  KW: "KWD",
  BH: "BHD",
  OM: "OMR",
  ZA: "ZAR",
};

export function guessCurrencyFromNavigator() {
  const lang = typeof navigator !== "undefined" ? navigator.language : "";
  const region = lang.includes("-") ? lang.split("-")[1].toUpperCase() : null;
  return (region && REGION_TO_CURRENCY[region]) || "USD";
}

export function formatMoney(amount, currency, locale) {
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

export async function getRateEGPTo(currency) {
  if (!currency || currency === BASE_CURRENCY) return 1;

  const cacheKey = `fx:EGP:${currency}`;
  const cached =
    typeof localStorage !== "undefined" ? localStorage.getItem(cacheKey) : null;

  if (cached) {
    try {
      const { rate, ts } = JSON.parse(cached);
      if (rate && ts && Date.now() - ts < 12 * 60 * 60 * 1000) return rate;
    } catch {}
  }

  // Base: EGP
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/EGP");
  const data = await res.json();
  const rate = data?.rates?.[currency];

  if (!rate) return 1;

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(cacheKey, JSON.stringify({ rate, ts: Date.now() }));
  }

  return rate;
}

export async function getRateFromTo(from, to) {
  if (!from || !to || from === to) return 1;

  const cacheKey = `fx:${from}:${to}`;
  const cached =
    typeof localStorage !== "undefined" ? localStorage.getItem(cacheKey) : null;

  if (cached) {
    try {
      const { rate, ts } = JSON.parse(cached);
      if (rate && ts && Date.now() - ts < 1 * 60 * 60 * 1000) return rate; // 1 hour cache
    } catch {}
  }

  try {
    const res = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`,
    );
    const data = await res.json();
    const rate = data?.rates?.[to];

    if (!rate) throw new Error("Rate not found");

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(cacheKey, JSON.stringify({ rate, ts: Date.now() }));
    }

    return rate;
  } catch (e) {
    console.error("FX Error:", e);
    // Fallback?
    return 1;
  }
}
