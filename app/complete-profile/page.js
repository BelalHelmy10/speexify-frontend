"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import api from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { APP_ROUTES, routeHref } from "@/lib/routes";
import { getDictionary, t } from "@/app/i18n";
import "@/styles/settings.scss";

function safeNextPath(rawNext, fallback) {
  if (!rawNext || !rawNext.startsWith("/") || rawNext.startsWith("//")) return fallback;
  try {
    const url = new URL(rawNext, "https://speexify.local");
    if (url.origin !== "https://speexify.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export default function CompleteProfilePage() {
  const { user, checking, refresh } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const locale = pathname?.startsWith("/ar") ? "ar" : "en";
  const dict = useMemo(() => getDictionary(locale, "settings"), [locale]);
  const copy = (key, fallback) => {
    const value = t(dict, key);
    return value === `__${key}__` ? fallback : value;
  };
  const fallbackPath = routeHref(APP_ROUTES.dashboard, locale);
  const nextPath = safeNextPath(params.get("next"), fallbackPath);

  const [phone, setPhone] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (checking) return;
    if (!user) {
      router.replace(routeHref(APP_ROUTES.login, locale));
      return;
    }
    if (user.phone) {
      window.location.replace(nextPath);
      return;
    }
    setPhone(user.phone || "");
    setMarketingConsent(Boolean(user.marketingPhoneConsentAt && !user.marketingPhoneOptOutAt));
    setLoading(false);
  }, [checking, locale, nextPath, router, user]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.patch("/me", {
        phone,
        marketingPhoneConsent: marketingConsent,
      });
      await refresh();
      window.location.replace(nextPath);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || copy("profile_error", "Failed to save profile"));
      setSaving(false);
    }
  }

  if (checking || loading || !user) {
    return (
      <main className="settings-modern">
        <div className="settings-loading" role="status">
          <Loader2 className="settings-loading__spinner" size={34} />
          <p>{copy("loading_settings", "Loading your account…")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="settings-modern">
      <div className="settings-shell settings-shell--single">
        <section className="settings-card settings-contact-card" aria-labelledby="complete-profile-title">
          <div className="settings-card__header">
            <div className="settings-card__icon"><Smartphone size={21} /></div>
            <div>
              <p className="settings-card__eyebrow">{copy("contact_completion_eyebrow", "One quick step")}</p>
              <h1 id="complete-profile-title">{copy("contact_completion_title", "Complete your profile")}</h1>
              <p>{copy("contact_completion_required", "Add a phone number so we can support your account and keep you informed about important session updates.")}</p>
            </div>
          </div>

          <form className="settings-form" onSubmit={submit}>
            <label className="settings-field">
              <span>{copy("phone_label", "Phone Number")}</span>
              <small>{copy("phone_hint", "Include your country code for reliable delivery.")}</small>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={copy("phone_placeholder", "+20 10 1234 5678")}
                autoComplete="tel"
                inputMode="tel"
                required
                autoFocus
              />
            </label>

            <label className="settings-toggle-row">
              <span className="settings-toggle-row__icon"><Smartphone size={18} /></span>
              <span className="settings-toggle-row__copy">
                <strong>{copy("marketing_consent_label", "Marketing messages")}</strong>
                <small>{copy("marketing_consent_hint", "Receive relevant offers and learning updates by SMS or WhatsApp. You can opt out anytime.")}</small>
              </span>
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(event) => setMarketingConsent(event.target.checked)}
              />
              <span className="settings-switch" aria-hidden="true" />
            </label>

            {error ? <div className="settings-status settings-status--error">{error}</div> : null}
            <button type="submit" className="settings-btn settings-btn--primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="settings-spin" /> : <CheckCircle2 size={16} />}
              {saving ? copy("status_saving", "Saving…") : copy("continue_to_account", "Continue to your account")}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
