"use client";

import { useState } from "react";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);

  async function startPayment() {
    try {
      setLoading(true);
      // amount is in *cents* → 100 EGP = 10000
      const body = {
        amountCents: 10000,
        orderId: `ord_${Date.now()}`, // your internal id
        customer: {
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
          phone: "01000000000",
        },
      };

      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());

      if (!res?.ok) throw new Error(res?.message || "Failed to init payment");

      // Option 1: redirect to hosted page
      window.location.href = res.iframeUrl;

      // Option 2 (embed): <iframe src={res.iframeUrl} />
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1>Checkout (Test)</h1>
      <p>Click to pay 100 EGP in Paymob sandbox.</p>
      <button onClick={startPayment} disabled={loading}>
        {loading ? "Starting…" : "Pay 100 EGP"}
      </button>
    </main>
  );
}
