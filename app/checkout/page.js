"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { me } from "@/lib/auth"; // ← Import your auth helper
import "@/styles/checkout.scss";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [pkg, setPkg] = useState(null);
  const [user, setUser] = useState(null); // ← Add user state
  const [loading, setLoading] = useState(false);
  const [loadingPkg, setLoadingPkg] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true); // ← Add loading state

  const planTitle = searchParams.get("plan");

  // Fetch current user
  useEffect(() => {
    (async () => {
      try {
        const userData = await me();
        setUser(userData?.user || null);
      } catch (err) {
        console.log("User not logged in:", err);
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  // Fetch package details
  // Fetch package details
  useEffect(() => {
    if (!planTitle) {
      setLoadingPkg(false);
      return;
    }

    (async () => {
      try {
        const res = await api.get("/api/packages?audience=INDIVIDUAL");
        const packages = res.data || [];

        console.log("🔍 Looking for package:", planTitle);
        console.log(
          "📦 Available packages:",
          packages.map((p) => p.title)
        );

        // Decode URL-encoded title and normalize for comparison
        const decodedTitle = decodeURIComponent(planTitle).trim();

        // Try multiple matching strategies
        let selected = packages.find(
          (p) => p.title.toLowerCase() === decodedTitle.toLowerCase()
        );

        // Fallback: fuzzy match (contains)
        if (!selected) {
          selected = packages.find(
            (p) =>
              p.title.toLowerCase().includes(decodedTitle.toLowerCase()) ||
              decodedTitle.toLowerCase().includes(p.title.toLowerCase())
          );
        }

        console.log("✅ Found package:", selected);
        setPkg(selected);
      } catch (err) {
        console.error("Failed to load package:", err);
      } finally {
        setLoadingPkg(false);
      }
    })();
  }, [planTitle]);

  async function startPayment() {
    if (!pkg) return;

    try {
      setLoading(true);

      // If user is not logged in, prompt them to login first
      if (!user) {
        const shouldLogin = confirm(
          "Please log in to continue with checkout. Redirect to login page?"
        );
        if (shouldLogin) {
          // Save the current checkout URL to return after login
          sessionStorage.setItem("checkout_return_url", window.location.href);
          router.push("/login");
        }
        return;
      }

      const USD_TO_EGP_RATE = 50;
      const amountEGP = pkg.priceUSD * USD_TO_EGP_RATE;
      const amountCents = Math.round(amountEGP * 100);

      // Parse user name
      const nameParts = (user.name || "User").split(" ");
      const firstName = nameParts[0] || "User";
      const lastName = nameParts.slice(1).join(" ") || "";

      const body = {
        amountCents,
        orderId: `order_${Date.now()}_${pkg.id}_user${user.id}`,
        currency: "EGP",
        customer: {
          firstName,
          lastName,
          email: user.email || "user@example.com",
          phone: user.phone || "01000000000",
        },
      };

      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      }).then((r) => r.json());

      if (!res?.ok) throw new Error(res?.message || "Failed to init payment");

      window.location.href = res.iframeUrl;
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Show loading while fetching user and package
  if (loadingPkg || loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Package not found
  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Package not found</h1>
          <p className="text-gray-600 mb-6">
            The package you selected could not be found.
          </p>
          <button
            onClick={() => router.push("/packages")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            View all packages
          </button>
        </div>
      </div>
    );
  }

  const USD_TO_EGP_RATE = 50;
  const priceEGP = pkg.priceUSD * USD_TO_EGP_RATE;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with User Info */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Checkout</h1>
          {user && (
            <div className="text-sm text-gray-600">
              Logged in as <span className="font-semibold">{user.email}</span>
            </div>
          )}
        </div>

        {/* Login Warning (if not logged in) */}
        {!user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Login required
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  You'll be prompted to log in before payment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Package Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">{pkg.title}</h2>
          <p className="text-gray-600 mb-4">{pkg.description}</p>

          {/* Package Details */}
          <div className="border-t pt-4 space-y-2">
            {pkg.sessionsPerPack && (
              <div className="flex justify-between">
                <span className="text-gray-600">Sessions:</span>
                <span className="font-semibold">{pkg.sessionsPerPack}</span>
              </div>
            )}
            {pkg.durationMin && (
              <div className="flex justify-between">
                <span className="text-gray-600">Duration per session:</span>
                <span className="font-semibold">{pkg.durationMin} min</span>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between text-lg mb-2">
              <span className="text-gray-700">Package Price (USD):</span>
              <span className="font-semibold">${pkg.priceUSD}</span>
            </div>
            <div className="flex justify-between text-lg mb-2">
              <span className="text-gray-700">Price (EGP):</span>
              <span className="font-semibold">EGP {priceEGP.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold border-t pt-3 mt-3">
              <span>Total:</span>
              <span className="text-blue-600">EGP {priceEGP.toFixed(2)}</span>
            </div>
          </div>

          {/* Exchange Rate Note */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            💱 Exchange rate: $1 USD = {USD_TO_EGP_RATE} EGP
          </div>
        </div>

        {/* Customer Information Preview (if logged in) */}
        {user && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="font-semibold mb-3">Billing Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span>{user.name || "Not provided"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span>{user.email}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Button */}
        <button
          onClick={startPayment}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold text-lg transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Pay EGP ${priceEGP.toFixed(2)}`
          )}
        </button>

        {/* Security Note */}
        <div className="mt-6 text-center text-sm text-gray-600">
          🔒 Secured by Paymob payment gateway
        </div>

        {/* Back Link */}
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push("/packages")}
            className="text-blue-600 hover:underline"
          >
            ← Back to packages
          </button>
        </div>
      </div>
    </div>
  );
}
