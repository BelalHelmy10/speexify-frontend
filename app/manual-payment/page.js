"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { oneOnOnePlans, groupPlans } from "@/lib/plans";
import {
  calculatePackagePrice,
  formatRegionalPrice,
} from "@/lib/regional-pricing";

function findPlanByTitle(title) {
  if (!title) return null;
  const decoded = decodeURIComponent(title).trim().toLowerCase();
  const all = [...oneOnOnePlans, ...groupPlans];
  return (
    all.find((p) => p.title.toLowerCase() === decoded) ||
    all.find((p) => p.title.toLowerCase().includes(decoded)) ||
    all.find((p) => decoded.includes(p.title.toLowerCase()))
  );
}

function CopyRow({ label, value, hint }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {
      // no-op
    }
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderTop: "1px solid #eee",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, opacity: 0.7 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
          {value || "—"}
        </div>
        {hint ? (
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
            {hint}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onCopy}
        disabled={!value}
        style={{
          padding: "8px 10px",
          border: "1px solid #ddd",
          borderRadius: 10,
          cursor: value ? "pointer" : "not-allowed",
          background: "#fff",
          whiteSpace: "nowrap",
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function ManualPaymentPage() {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountLoading, setDiscountLoading] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const localePrefix = locale === "ar" ? "/ar" : "";

  const planTitle = searchParams.get("plan");
  const plan = useMemo(() => findPlanByTitle(planTitle), [planTitle]);

  // passed from /packages in the "next" target
  const cc = searchParams.get("cc"); // countryCode
  const cur = searchParams.get("cur"); // viewer currency (for formatting)

  // discount kept in URL query (?discount=CODE)
  const initialDiscount = useMemo(
    () => (searchParams.get("discount") || "").trim(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams]
  );

  const [discountInput, setDiscountInput] = useState(initialDiscount);

  // Keep input in sync if user navigates back/forward and URL changes
  useEffect(() => {
    setDiscountInput(initialDiscount);
  }, [initialDiscount]);

  const setQueryParam = useCallback(
    (key, value) => {
      const sp = new URLSearchParams(searchParams.toString());

      if (!value) sp.delete(key);
      else sp.set(key, value);

      const qs = sp.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    },
    [pathname, router, searchParams]
  );

  async function onApplyDiscount(e) {
    e?.preventDefault?.();

    const clean = (discountInput || "").trim();
    setQueryParam("discount", clean || "");

    if (!clean) {
      setDiscountPercent(0);
      setErr("");
      return;
    }

    try {
      setDiscountLoading(true);
      const res = await api.post("/api/discounts/validate", { code: clean });
      setDiscountPercent(res.data.percentage || 0);
      setErr("");
    } catch {
      setDiscountPercent(0);
      setErr("Invalid discount code");
    } finally {
      setDiscountLoading(false);
    }
  }

  function onClearDiscount() {
    setDiscountInput("");
    setDiscountPercent(0);
    setErr("");
    setQueryParam("discount", "");
  }

  // Auto-apply if discount exists in URL
  useEffect(() => {
    if (!initialDiscount) return;

    (async () => {
      try {
        setDiscountLoading(true);
        const res = await api.post("/api/discounts/validate", {
          code: initialDiscount,
        });
        setDiscountPercent(res.data.percentage || 0);
        setErr("");
      } catch {
        setDiscountPercent(0);
        setErr("Invalid discount code");
      } finally {
        setDiscountLoading(false);
      }
    })();
  }, [initialDiscount]);

  if (!plan) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Manual payment</h1>
        <p style={{ color: "crimson" }}>
          Plan not found. Please go back and select a package again.
        </p>
        <button onClick={() => router.push(`${localePrefix}/packages`)}>
          Back to packages
        </button>
      </div>
    );
  }

  // apply discount percent to pricing
  const regional = useMemo(() => {
    return calculatePackagePrice(plan, cc || null, discountPercent);
  }, [plan, cc, discountPercent]);

  const pricingCurrency = regional?.displayCurrency || "USD";

  const wise = {
    currency: pricingCurrency,
    name: process.env.NEXT_PUBLIC_WISE_NAME || "",
    accountNumber: process.env.NEXT_PUBLIC_WISE_ACCOUNT_NUMBER || "",
    accountType: process.env.NEXT_PUBLIC_WISE_ACCOUNT_TYPE || "",
    routingNumber: process.env.NEXT_PUBLIC_WISE_ROUTING_NUMBER || "",
    swiftBic: process.env.NEXT_PUBLIC_WISE_SWIFT_BIC || "",
    bankNameAddress: process.env.NEXT_PUBLIC_WISE_BANK_NAME_ADDRESS || "",
    referenceText:
      process.env.NEXT_PUBLIC_WISE_REFERENCE_TEXT ||
      "Use your email as the transfer reference",
  };

  function onConfirmTransferred() {
    const message =
      "Thanks for your payment. We’ll be in touch soon to confirm and activate your package.";
    router.push(
      `${localePrefix}/dashboard?notice=${encodeURIComponent(message)}`
    );
  }

  const amount =
    regional?.isCustomPricing || !regional?.displayAmount
      ? "Custom"
      : formatRegionalPrice(
          {
            ...regional,
            displayCurrency: cur || pricingCurrency,
          },
          locale
        );

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1>Pay via bank transfer (Wise)</h1>

      <div
        style={{
          marginTop: 12,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 14,
        }}
      >
        <h3 style={{ marginTop: 0 }}>{plan.title}</h3>

        <form
          onSubmit={onApplyDiscount}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>
              Discount code (optional)
            </div>
            <input
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="Enter code"
              autoCapitalize="characters"
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 10,
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || discountLoading}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              whiteSpace: "nowrap",
              marginTop: 18,
            }}
          >
            {discountLoading ? "Applying..." : "Apply"}
          </button>

          {initialDiscount ? (
            <button
              type="button"
              onClick={onClearDiscount}
              disabled={submitting || discountLoading}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginTop: 18,
              }}
            >
              Clear
            </button>
          ) : null}
        </form>

        <p style={{ margin: "12px 0 0" }}>
          Amount: <b>{amount}</b>
        </p>

        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
          <b>Reference:</b> {wise.referenceText}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{wise.currency}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Account details</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <CopyRow label="Name" value={wise.name} />
          <CopyRow label="Account number" value={wise.accountNumber} />
          <CopyRow
            label="Account type"
            value={wise.accountType}
            hint="Only used for domestic transfers"
          />
          <CopyRow
            label="Routing number (for wire and ACH)"
            value={wise.routingNumber}
            hint="Only used for domestic transfers"
          />
          <CopyRow
            label="Swift/BIC"
            value={wise.swiftBic}
            hint="Only used for international Swift transfers"
          />
          <CopyRow label="Bank name and address" value={wise.bankNameAddress} />
        </div>
      </div>

      {err ? <p style={{ marginTop: 12, color: "crimson" }}>{err}</p> : null}

      <div style={{ marginTop: 16 }}>
        <button
          onClick={onConfirmTransferred}
          style={{ padding: "10px 14px" }}
          disabled={submitting}
        >
          I’ve transferred the amount
        </button>

        <p style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          After you transfer, click this and we’ll contact you shortly to
          confirm and activate your package.
        </p>
      </div>
    </div>
  );
}
