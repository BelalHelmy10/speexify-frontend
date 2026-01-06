"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { oneOnOnePlans, groupPlans } from "@/lib/plans";
import { Copy, Check, CreditCard, Building2, AlertCircle } from "lucide-react";

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
    <div className="border-t border-gray-100 py-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
        <div className="text-lg font-semibold text-gray-900 break-all">
          {value || "—"}
        </div>
        {hint && (
          <div className="text-xs text-gray-500 mt-2 leading-relaxed">
            {hint}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onCopy}
        disabled={!value}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
          transition-all duration-200 whitespace-nowrap shrink-0
          ${
            value
              ? copied
                ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-200"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
              : "bg-gray-50 text-gray-400 border-2 border-gray-100 cursor-not-allowed"
          }
        `}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy
          </>
        )}
      </button>
    </div>
  );
}

export default function ManualPaymentPage() {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
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
      "Thanks for your payment. We'll be in touch soon to confirm and activate your package.";
    router.push(
      `${localePrefix}/dashboard?notice=${encodeURIComponent(message)}`
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Plan Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            Please go back and select a package again.
          </p>
          <button
            onClick={() => router.push(`${localePrefix}/packages`)}
            className="w-full px-6 py-3 bg-sky-600 text-white font-semibold rounded-xl hover:bg-sky-700 transition-colors duration-200"
          >
            Back to Packages
          </button>
        </div>
      </div>
    );
  }

  const amount = plan.priceEGP != null ? `${plan.priceEGP} EGP` : "Custom";

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-600 rounded-2xl mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Bank Transfer Payment
          </h1>
          <p className="text-gray-600">
            Complete your payment via Wise transfer
          </p>
        </div>

        {/* Plan Details Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 mb-6 border-2 border-sky-100">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-sm font-medium text-sky-700 mb-1">
                Selected Plan
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{plan.title}</h3>
            </div>
            <div className="bg-sky-600 text-white px-4 py-2 rounded-xl font-bold text-lg shrink-0">
              {amount}
            </div>
          </div>

          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-900 mb-1">Important</div>
              <div className="text-sm text-amber-800">{wise.referenceText}</div>
            </div>
          </div>
        </div>

        {/* Account Details Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 mb-6 border-2 border-gray-100">
          <div className="flex items-center justify-between mb-6 pb-6 border-b-2 border-gray-100">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Transfer Details
              </h2>
              <p className="text-sm text-gray-600">
                Send funds to the following account
              </p>
            </div>
            <div className="bg-sky-100 text-sky-800 px-4 py-2 rounded-xl font-bold text-lg">
              {wise.currency}
            </div>
          </div>

          <div className="space-y-1">
            <CopyRow label="Recipient Name" value={wise.name} />
            <CopyRow label="Account Number" value={wise.accountNumber} />
            <CopyRow
              label="Account Type"
              value={wise.accountType}
              hint="Only used for domestic transfers"
            />
            <CopyRow
              label="Routing Number"
              value={wise.routingNumber}
              hint="For wire and ACH transfers (domestic only)"
            />
            <CopyRow
              label="SWIFT/BIC"
              value={wise.swiftBic}
              hint="For international wire transfers"
            />
            <CopyRow label="Bank Name & Address" value={wise.bankNameAddress} />
          </div>
        </div>

        {/* Error Message */}
        {err && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{err}</div>
          </div>
        )}

        {/* Confirmation Button */}
        <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 border-2 border-gray-100">
          <button
            onClick={onConfirmTransferred}
            disabled={submitting}
            className={`
              w-full px-8 py-4 font-bold text-lg rounded-2xl shadow-lg
              transition-all duration-200 flex items-center justify-center gap-3
              ${
                submitting
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-sky-600 to-cyan-600 text-white hover:shadow-xl hover:from-sky-700 hover:to-cyan-700"
              }
            `}
          >
            <CreditCard className="w-6 h-6" />
            {submitting ? "Processing..." : "I've Transferred the Amount"}
          </button>

          <p className="text-sm text-gray-600 text-center mt-4 leading-relaxed">
            After completing your transfer, click the button above. We'll
            contact you shortly to confirm and activate your package.
          </p>
        </div>

        {/* Security Badge */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            Secure payment processing
          </div>
        </div>
      </div>
    </div>
  );
}
