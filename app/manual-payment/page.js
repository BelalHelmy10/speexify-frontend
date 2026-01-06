"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { oneOnOnePlans, groupPlans } from "@/lib/plans";

// // --- IMPORTANT: paste your plan arrays here or import them (see note below) ---
// const oneOnOnePlans = [
//   /* paste from packages page */
// ];
// const groupPlans = [
//   /* paste from packages page */
// ];

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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const localePrefix = locale === "ar" ? "/ar" : "";

  const planTitle = searchParams.get("plan");
  const plan = useMemo(() => findPlanByTitle(planTitle), [planTitle]);

  const wise = {
    currency: process.env.NEXT_PUBLIC_WISE_CURRENCY || "USD",
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

  const amount = plan.priceEGP != null ? `${plan.priceEGP} EGP` : "Custom";

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
        <p style={{ margin: "8px 0" }}>
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

      <div style={{ marginTop: 16 }}>
        <button onClick={onConfirmTransferred} style={{ padding: "10px 14px" }}>
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
