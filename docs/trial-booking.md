# Trial booking

The public scheduler lives at `/trial-booking` and `/ar/trial-booking`. Both routes work without a learner account. Administration is under `/admin/free-sessions` (or `/ar/admin/free-sessions`). The original onboarding requests remain in a separate tab.

## First setup

1. Open **Free sessions → Availability** from the admin dashboard.
2. Set the booking rules. Defaults are 30-minute sessions, zero buffer, 12 hours' advance notice, and a 14-day booking horizon.
3. Add a date, first start time, finish time, duration, buffer and number of places per time. A 30-minute duration with zero buffer generates 09:00, 09:30, 10:00, etc. Every generated appointment must finish within the specified range.
4. Copy an open day's times to another date when needed. Copying preserves full capacity; conflicting target times reject the whole operation.
5. Share the English or Arabic booking URL using **Copy booking link**. Existing marketing/onboarding links continue to use their current destination.

All admin inputs use `Africa/Cairo`, including seasonal clock changes. Times can be prepared up to 90 days ahead; only those inside the configured booking horizon and minimum notice are offered publicly. Nothing is seeded into production.

## Editing availability

- **Edit time** changes the date, start time, duration, buffer and capacity of an existing time.
- **+ / −** change the number of learners who can reserve the same time. Capacity cannot fall below existing reservations.
- Adding the exact same time and duration again increases capacity. Different durations/buffers at the same start are rejected; use Edit instead.
- **Close time** hides remaining capacity without cancelling existing reservations. Reopen makes it available again if inside the booking window.
- Editing the schedule of a time with reservations requires an explicit acknowledgement. Active bookings become Reserved and trainer assignments are cleared. Contact affected learners and reconfirm their trainers. Their private links display the updated time.
- Past times with bookings, and times with completed/no-show bookings, cannot be moved. Cancelled bookings remain in the historical record.
- Duration/buffer rule changes affect defaults for new availability, not previously published times.

## Learner flow

Choose a day → choose a time → enter full name and an international phone number → reserve. Arabic and Persian phone digits are normalized. The learner's detected timezone is used initially and can be changed. Language switching preserves entered details and selection within the tab.

The success screen includes appointment details, a calendar download and a private management link. That link allows viewing, rescheduling or cancellation without login until the session starts; viewing remains available for 30 days after the session ends. The token is generated with cryptographic randomness, stored hashed in the database, and passed in the URL fragment rather than the query string. Treat it as a private credential. Learners must save it; no SMS/WhatsApp delivery of the link is automated.

Reservations are not classroom sessions. Your team contacts the learner, assigns a trainer, and provides joining instructions. If the classroom requires an account, arrange that account and create the session through the existing scheduler.

## Daily administration

The Bookings tab includes search, Today/Upcoming/All dates filters, status filters, pagination and CSV export (up to 10,000 filtered records). Expand a booking to assign a trainer, write notes, change status or open a localized WhatsApp message. Opening WhatsApp does not send the message automatically.

Statuses: Reserved → Confirmed → Completed / No-show; Cancelled releases the place. Confirmation requires a trainer. Attendance can be recorded only after the session ends. Closed bookings cannot be reopened.

Trainer assignment and confirmation check existing trial bookings and classroom sessions, including buffers. Creating/changing sessions through the separate existing classroom scheduler does not synchronize with trial reservations. Staff must check both schedules, including when converting a reservation to a classroom session. This version intentionally uses manual trainer assignment.

New reservations, cancellations and reschedules attempt an in-app admin alert and queue an email to `ADMIN_NOTIFICATION_EMAIL` (falling back to `support@speexify.com`). The existing notification delivery worker/provider configuration is required for email delivery. The database record remains authoritative if notifications fail. Learner messages, confirmations, reminders and changes are followed up manually.

## Data and safeguards

Backend additions: `TrialBookingSettings`, `TrialSlot`, `TrialBooking`, and `/api/trial-bookings/*` / `/api/admin/trial-bookings/*` routes. No account or existing trial-request record is created automatically.

PostgreSQL transaction-scoped advisory locking serializes trial mutations across API instances. Capacity and active-phone constraints add database protection. Booking retries reuse the management token and return the same reservation. Failed rescheduling rolls back completely; repeated cancellation cannot release a place twice. One upcoming active reservation is allowed per normalized phone number.

Public responses contain no booking roster or trainer details. Management requires the private token; administration requires authenticated admin access. Existing CSRF middleware applies. Public rate limits, input validation, a honeypot and CSV formula escaping are included. Phone ownership is not verified by OTP in this version.

## Deployment

The feature is implemented locally; it is not automatically live. Deploy both repositories through the normal release process:

1. Apply backend migration `20261127020000_trial_bookings` with the existing migration deployment command (`npm run prisma:migrate`). Use the migration rather than `db push` in production: its CHECK constraints protect capacity and valid settings.
2. Regenerate Prisma (`npm run prisma:generate`) and deploy/restart the backend.
3. Deploy the frontend. Verify the two public pages logged out and the admin page with an admin account.
4. Add real availability and verify the configured admin notification destination and delivery worker before sharing the booking link.

The migration only adds tables, indexes, constraints and a settings row. Existing onboarding requests are preserved. Rollback can return the frontend/backend to the previous code while leaving the new tables intact; do not drop them after bookings have been accepted.

## Verification

- Frontend production build, targeted ESLint, style isolation and English/Arabic copy parity.
- Frontend unit tests: date grouping, Arabic phone digits, calendar export, and Cairo's 23/25-hour days.
- Backend unit tests: Cairo seasonal offsets, nonexistent/ambiguous local times, slot generation and token hashing.
- Real PostgreSQL test: 12 concurrent attempts for 3 places yield exactly 3 reservations; retries, duplicate phones, rollback, repeated cancellation, trainer conflicts, database constraints, admin access, CSV escaping, and occupied-slot editing.
- Chrome end-to-end: guest booking, reload recovery, rescheduling, cancellation, adding/editing times in admin, and EN/AR layouts at 360/768/1440 pixels.

The database test is opt-in: set `TRIAL_TEST_DATABASE_URL` to a disposable loopback database named `speexify_trial_qa`, apply the full schema plus migration constraints, then run `NODE_ENV=test node --test tests/e2e/trial-bookings.test.js` in the backend. It rejects non-loopback hosts and any other database name. Browser QA (`node scripts/checkTrialBooking.mjs`) requires the isolated local QA fixture API, including its local-only `/api/qa-login` route; that fixture route is not part of application code.

Validation does not include live-provider email delivery, live classroom conversion, or real-device Safari/Firefox testing.
