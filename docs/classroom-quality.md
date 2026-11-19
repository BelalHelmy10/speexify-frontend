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

This layer uses a simulated Jitsi API. It verifies the classroom's handling of
events and layout, not actual camera capture, WebRTC negotiation, or received
media in those engines. A green matrix alone cannot establish device media
compatibility.

It verifies stable iframe ownership through rotation, horizontal overflow,
permission denial and mid-call permission loss, automatic Bluetooth/headset and
camera hot-plug updates, offline/online recovery, background/foreground events,
and connection interruption/restoration without recreating the call.

The admission regression also runs the real lobby hook: it holds the learner
in the waiting room, then admits them and requires an attached, visible call.
Do not replace that scenario with an always-admitted lobby stub. A call API can
be constructed inside a detached portal without any iframe in the classroom.

For an opt-in check of actual received media through the real classroom shell
and lobby hook, run:

```bash
node scripts/checkClassroomAdmission.mjs
node scripts/checkLiveClassroomAdmission.mjs
```

The first command is local and uses a simulated video API. The second creates
an isolated synthetic room on the configured video service, uses fake media,
and requires inbound audio and decoded video on both clients after admission.
It does not log into Speexify, enter a customer session, or replace physical
iPhone/Safari testing. Its phone-sized client is Chromium with a small viewport.

Failure traces, screenshots, and video are written to `test-results/classroom`
and `playwright-report/classroom`. CI retains them for 14 days.

### Material following

```bash
node scripts/checkClassroomMaterialSync.mjs
node scripts/checkAdaptivePdf.mjs
```

The material regression runs the real classroom, PrepShell and PDF viewer in
separate trainer and learner browser pages. Only PDF rendering, API calls and
the message transport are simulated. It checks matching PDF coordinates on
phone, tablet and desktop viewports, a late join while the PDF is loading,
non-first pages, saved trainer positions and resource switching. It does not enter a production session or verify physical Safari devices.

Keep trainer restoration separate from learner following: restoring a trainer
into the cropped learner window removes the scroll range and suppresses future
viewport broadcasts. Scroll listeners and the parent scroll reference must
attach when the asynchronous viewer's DOM node mounts, including when its URL
was unavailable on the component's first render.

## 2. TURN-only relay verification

First verify what the **hosted Jitsi service actually supplies to browsers**.
An independently supplied TURN credential can pass the standalone test below
even when Jitsi never advertises that service to classroom participants.

```bash
node scripts/diagnoseLiveClassroom.mjs p2p
node scripts/diagnoseLiveClassroom.mjs bridge
node scripts/diagnoseLiveClassroom.mjs relay
```

These are opt-in production-service probes. Each creates a fresh, isolated room
with two synthetic participants and fake camera/microphone input; they do not
join customer sessions. Set `PUPPETEER_EXECUTABLE_PATH` outside macOS. Each probe
prints JSON lines, inspects actual inbound audio/video counters, and exits
unsuccessfully unless both clients receive media. Relay mode additionally
requires a selected relay candidate on both clients. Output includes advertised
ICE URLs and candidate types, but excludes credentials and candidate addresses.

The probe also runs the application's connection monitor against real iframe
events. Admission (`videoConferenceJoined`) is not proof of media connectivity.
The deployed iframe API supports `dataChannelOpened`, `dataChannelClosed`, and
`p2pStatusChanged`; it does not forward lib-jitsi-meet's `connectionInterrupted`
or `connectionRestored` events. `peerConnectionFailure` is conditional on
rtcstats monitoring and must not be the sole failure detector. A bridge data
channel or active P2P transport indicates a connection, but is not itself proof
of decoded remote video; the probe checks inbound frames separately.

Require the hosted relay probe to pass after a video-server/network change.
Do not interpret a passing direct call or mock browser matrix as a relay pass.

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

Missing required configuration fails this workflow; an unconfigured run must
never appear to verify physical devices. The smoke script currently verifies
iframe visibility and lifecycle/geometry, not decoded remote audio/video.
Release evidence must additionally include a paired call on each physical
device with observed two-way media, including a forced relay case.

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
