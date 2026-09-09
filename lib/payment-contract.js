// Payment amounts are authoritative server quotes, expressed in minor units.
export function buildOrderId({ userId, packageId, timestamp }) {
  if (!userId || !packageId) {
    throw new Error("buildOrderId: userId and packageId are required");
  }
  const ts = Number.isFinite(timestamp) ? Number(timestamp) : Date.now();
  return `order_${ts}_${packageId}_user${userId}`;
}


export function readPaymentPricing(data) {
  const p = data?.pricing;
  if (!p || p.currency !== "EGP" || !Number.isSafeInteger(p.amountCents) || p.amountCents <= 0) {
    throw new Error("The payment amount could not be verified. Please refresh the price.");
  }
  return {...p, egpAmount: p.amountCents / 100};
}
export function confirmationFromResponse(data, expected) {
  const pricing = readPaymentPricing(data);
  if (!data.ok || !data.iframeUrl) throw new Error("Payment could not be prepared.");
  const mismatch = !expected || Math.round(expected.egpAmount * 100) !== pricing.amountCents;
  return {iframeUrl: data.iframeUrl, chargeAmountEGP: pricing.egpAmount,
    chargeCurrency: pricing.currency, expectedEgpAmount: expected?.egpAmount ?? pricing.egpAmount,
    mismatch, accepted: !mismatch};
}
