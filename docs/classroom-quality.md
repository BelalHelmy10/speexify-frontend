# Classroom browser and device quality gates

The classroom uses three complementary test layers. Passing only one layer is
not considered sufficient evidence that a realtime classroom release is safe.

## 1. Deterministic browser matrix

```bash
npx playwright install chromium firefox webkit
npm run qa:classroom:browsers
```

The committed Playwright version tracks current browser engines and requires
macOS 14 or newer for local WebKit. Use the Linux CI job from older Macs rather
than downgrading the repository-wide browser baseline.

The Playwright matrix runs the real classroom React components and production
Sass in:

- Chromium, Firefox, and WebKit desktop engines
- WebKit iPhone and iPad profiles
- Chromium Pixel and Android tablet profiles
- Teacher and learner layouts in portrait and landscape

It verifies stable iframe ownership through rotation, horizontal overflow,
permission denial and mid-call permission loss, automatic Bluetooth/headset and
camera hot-plug updates, offline/online recovery, background/foreground events,
and connection interruption/restoration without recreating the call.

Failure traces, screenshots, and video are written to `test-results/classroom`
and `playwright-report/classroom`. CI retains them for 14 days.

## 2. TURN-only relay verification

Configure an expiring test credential from the production TURN service:

```bash
export TURN_URL='turns:turn.example.com:5349?transport=tcp'
export TURN_USERNAME='short-lived-test-user'
export TURN_CREDENTIAL='short-lived-test-secret'
npm run qa:classroom:turn
```

The test creates two browser peers with `iceTransportPolicy: "relay"`, opens a
data channel, transfers a message, and inspects WebRTC stats. It fails unless
the nominated local and remote candidates are both `relay`. The general browser
matrix skips this check when credentials are absent; the dedicated command
fails closed.

Do not use permanent TURN credentials in local files or CI logs.

## 3. Actual mobile hardware

The scheduled `Classroom Real Devices` workflow drives Safari and Chrome on:

- iPhone 15 Pro
- iPad Pro 13-inch (2024)
- Google Pixel 8
- Samsung Galaxy Tab S9

Required repository secrets:

- `BROWSERSTACK_USERNAME`
- `BROWSERSTACK_ACCESS_KEY`
- `CLASSROOM_SMOKE_URL` — an HTTPS staging classroom URL
- `CLASSROOM_SMOKE_COOKIES_JSON` — optional JSON array of short-lived staging cookies

The real-device job joins by default, automatically accepts camera/microphone
prompts, requires a visible call frame, backgrounds and restores the physical
browser, switches the device to `no-network` and back to LTE, and then rotates
to landscape. It verifies that the same call frame survives every transition.
Set repository variable `CLASSROOM_REAL_DEVICE_JOIN=0` only for diagnosing a
staging-session setup problem; that reduced mode is not release evidence.

Device models can be overridden for a local run with
`CLASSROOM_REAL_DEVICES_JSON`. Keep at least one recent and one older supported
OS version in the nightly matrix. Device-cloud emulation is not a replacement
for this workflow; these sessions run on actual vendor hardware.

## Hardware-only acceptance

Cloud devices do not expose a pairable customer Bluetooth accessory or permit
portable, cross-vendor automation of the operating-system Settings UI. The
deterministic suite therefore verifies the browser `devicechange` contract,
selection fallback, and mid-call permission-error recovery on every engine.
Before media-stack releases, also run one physical accessory pass on a local
iPhone, iPad, and Android device: connect and disconnect a Bluetooth headset,
switch microphone/output routes, revoke and restore camera/microphone in system
settings, background for 30 seconds, and move between Wi-Fi and cellular. Log
device, OS, browser, accessory, and outcome with the release evidence.

## Release policy

- Pull requests must pass all seven deterministic Playwright projects.
- TURN verification must pass before changes to Jitsi, ICE, firewall, proxy, or
  media configuration are promoted.
- The most recent real-device run must be green before a classroom release.
- The hardware-only Bluetooth/Settings pass is required for media-stack changes.
- A failure must retain the trace/video/screenshot and the affected browser,
  orientation, permission state, and connection transition.
