"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { readPaymentPricing } from "@/lib/payment-contract";

let cached = null;
let pending = null;
export function fetchPricingCatalog() {
  if (cached && Date.now() - cached.at < 60_000) return Promise.resolve(cached.data);
  if (!pending) pending = api.get("/pricing/catalog").then(({data}) => {
    if (!Array.isArray(data.packages) || !data.regionToken) throw new Error("Prices are unavailable.");
    cached = {at: Date.now(), data};
    return data;
  }).finally(() => {pending = null;});
  return pending;
}
export function mergeCatalogPlans(editorial, catalog) {
  if (!catalog) return [];
  return editorial.flatMap(plan => {
    const item = catalog.packages.find(p => p.catalogKey === plan.id);
    if (!item) return [];
    return [{...plan, backendId: item.id, priceEGP: item.priceEGP,
      sessionsPerPack: item.sessionsPerPack, durationMin: item.durationMin,
      pricing: item.pricing, regionToken: catalog.regionToken}];
  });
}
export function usePricingCatalog() {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setError("");
    fetchPricingCatalog().then(data => {if (live) setCatalog(data);})
      .catch(() => {if (live) setError("Prices are temporarily unavailable.");});
    return () => {live = false;};
  }, [attempt]);
  return {catalog, error, loading: !catalog && !error, retry: () => {cached = null; setAttempt(n => n + 1);}};
}

export function useCheckoutQuote(packageId, regionToken, discountCode) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const requestKey = JSON.stringify([packageId, regionToken, discountCode, attempt]);
  useEffect(() => {
    let live = true;
    setResult(null);
    setError("");
    setLoading(true);
    if (!packageId) return () => {live = false;};
    api.post("/pricing/quote", {packageId, regionToken: regionToken || null, discountCode: discountCode || null})
      .then(({data}) => {
        const pricing = readPaymentPricing(data);
        if (!data.quoteToken) throw new Error("Missing price confirmation.");
        if (live) setResult({pricing, quoteToken: data.quoteToken, requestKey});
      }).catch(e => {if (live) setError(e?.response?.data?.message || "We could not confirm the price. Please try again.");})
      .finally(() => {if (live) setLoading(false);});
    return () => {live = false;};
  }, [packageId, regionToken, discountCode, attempt, requestKey]);
  // Never expose the previous quote for one render after an input changes.
  const current = result?.requestKey === requestKey ? result : null;
  return {pricing: current?.pricing || null, quoteToken: current?.quoteToken || null,
    loading, error, refresh: () => setAttempt(n => n + 1)};
}
