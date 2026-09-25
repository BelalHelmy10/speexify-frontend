# Production analytics

Speexify uses a small GA4 adapter in `lib/analytics.js`. It is enabled only
when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set; without that variable, local
development prints sanitized events to the browser console and sends nothing
to a provider.

## Configure the provider

1. Create or open the GA4 web data stream for the production Speexify domain.
2. Copy its `G-XXXXXXXXXX` measurement ID.
3. In Vercel, open the frontend project → **Settings** → **Environment
   Variables** and add `NEXT_PUBLIC_GA_MEASUREMENT_ID` for **Production**.
4. Use a separate measurement ID for Preview/Staging so test traffic does not
   pollute production reports.
5. Redeploy. The ID is intentionally public and is safe to expose in the
   browser; do not add a GA4 API secret to a `NEXT_PUBLIC_` variable.

The CSP allowlist for Google Tag Manager and GA4 is in `proxy.js`.

## Events

| Event | Trigger | Important parameters |
| --- | --- | --- |
| `page_view` | Public route change | `page_path`, `app_locale` |
| `generate_lead` | Contact or individual request succeeds | `source`, `topic`, `role`, `app_locale` |
| `trial_requested` | Individual starter-session request succeeds | `source`, `goal`, `availability`, `app_locale` |
| `newsletter_subscribed` | Footer newsletter request succeeds | `source`, `app_locale` |
| `signup_started` | Registration verification code is sent | `method`, `app_locale` |
| `signup_completed` | Email or Google registration succeeds | `method`, `has_name`, `app_locale` |
| `checkout_started` | A valid checkout review is submitted | `package_id`, `plan`, `currency`, `app_locale` |
| `checkout_intent_created` | Backend creates the payment intent | `package_id`, `plan`, `payment_provider`, `app_locale` |
| `payment_redirected` | Customer is sent to Paymob | `payment_provider`, `app_locale` |
| `payment_completed` | Payment result resolves to paid | `payment_provider`, `payment_status`, `app_locale` |
| `payment_failed` | Payment result resolves to failed | `payment_provider`, `payment_status`, `app_locale` |
| `payment_pending` | Payment needs review after polling | `payment_provider`, `payment_status`, `app_locale` |
| `payment_retry_started` | Customer retries a payment | `payment_provider`, `app_locale` |

Every conversion event carries `app_locale` as either `en` or `ar`, so English
and Arabic funnels can be compared without duplicating event names. Direct
identifiers such as email, phone, names, user IDs, session IDs, order IDs,
passwords, credentials, and message content are dropped by the adapter.

## Verify locally

Leave the measurement ID blank, run `npm run dev`, and open the browser
console. Events appear as `[analytics]` entries with their sanitized payload.
For a production-like check, set a real non-production GA4 measurement ID in
`.env.local`, restart the dev server, and use DevTools → **Network** filtered
to `collect` to see GA4 requests.

## Find events in GA4

- **Reports → Realtime**: use **Event count by Event name** to confirm events
  arriving immediately.
- **Reports → Engagement → Events**: open an event for its event count and
  users.
- **Explore → Free form**: use `event_name` as rows and register `app_locale`
  under **Admin → Data display → Custom definitions → Create custom
  dimension** as an event-scoped dimension. Add `app_locale` as a column or
  filter to compare `/` and `/ar` conversion performance.

## Manual funnel walkthrough

1. English lead: open `/individual-training`, submit the request, and check
   `generate_lead` plus `trial_requested`.
2. Arabic lead: repeat at `/ar/individual-training` and confirm
   `app_locale=ar`.
3. Signup: open `/register`, send the verification code, then complete the
   account to produce `signup_started` and `signup_completed`.
4. Checkout: sign in, open `/packages`, choose a plan, review it, and proceed
   to Paymob for `checkout_started`, `checkout_intent_created`, and
   `payment_redirected`.
5. Payment result: return to `/payment/success`; the result produces
   `payment_completed`, `payment_failed`, or `payment_pending` exactly once
   per order/status state.
