# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An **offline Android desk-clock app**: a single HTML screen (`app/index.html`) wrapped in a Capacitor WebView. No network, no backend, no build step for the web layer — the `app/` directory ships as-is. Touching the screen (or ← / → keys) cycles through 4 clock faces; the selected face persists in `localStorage` (`deskclock.face`).

App id: `com.precipi.deskclock` · Capacitor `webDir` is `app/`.

## Repository layout

```
deskclock/
├── app/                        # Capacitor webDir — entire web app
│   ├── index.html              # 508 lines: HTML + CSS + JS (the whole app)
│   ├── manifest.json           # PWA manifest (13 lines)
│   ├── icons/                  # SVG icons (192 & 512) for manifest
│   └── fonts/                  # 4 WOFF2 fonts (all embedded for offline use)
│       ├── jost-var.woff2      # Jost variable (weights 200-500) — face1 Minimal
│       ├── archivo-var.woff2   # Archivo variable (weights 500-700) — face2 Flip
│       ├── orbitron-var.woff2  # Orbitron variable (weights 400-700) — face4 Neon
│       └── anton-400.woff2     # Anton 400 — face3 Typography
├── android/                    # Capacitor-generated Android project (Gradle)
│   └── app/src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/precipi/deskclock/
│       │   ├── MainActivity.java        # 58 lines — WebView host + screen control
│       │   └── DeskClockWidget.java     # 28 lines — home-screen widget provider
│       └── res/
│           ├── layout/activity_main.xml        # CoordinatorLayout + WebView
│           ├── layout/widget_deskclock.xml     # TextClock + date + AM/PM
│           ├── xml/deskclock_widget_info.xml   # Widget metadata
│           └── drawable/widget_bg.xml          # Dark rounded-rect background
├── assets/                     # Source files for icon generation (input to generate-icons.js)
├── docs/
│   └── DESIGN.md               # 123 lines — per-face color/font/spacing/animation spec
├── screenshots/                # Reference screenshots
├── CLAUDE.md                   # This file
├── README.md                   # Korean-language project overview (81 lines)
├── capacitor.config.json       # appId, webDir, android.backgroundColor
├── package.json                # Capacitor 8.3.4 deps (no scripts)
└── generate-icons.js           # Renders SVG → PNG icons via `sharp` (45 lines)
```

## Build & install

Requires Node.js, JDK 17+, and Android SDK.

```bash
npm install                          # install Capacitor CLI/deps
npx cap copy android                 # sync app/ web assets into the native project
./android/gradlew -p android assembleDebug   # build (*nix; use gradlew.bat on Windows)
# output: android/app/build/outputs/apk/debug/app-debug.apk

# install + launch on a connected device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.precipi.deskclock -c android.intent.category.LAUNCHER 1
```

**Always run `npx cap copy android` after editing anything under `app/`** — Gradle builds from the copied assets in `android/app/src/main/assets/public`, not from `app/` directly.

`android/local.properties` is gitignored and must point at the SDK (`sdk.dir=...`); without it Gradle fails with "SDK location not found". On the developer's machine the SDK is at `C:\Users\seung\AppData\Local\Android\Sdk`.

There are no tests, linters, or web bundler — `package.json` has no scripts.

## App icons

Edit `generate-icons.js` (uses `sharp` — install separately with `npm install sharp`), then:

```bash
node generate-icons.js                       # renders SVG → PNG into assets/
npx capacitor-assets generate --android     # copies to all Android mipmap/ densities
```

Icon design: minimal clock face at 10:10 position, white circle/hands, amber center dot on `#0c0c0e` background.

## Architecture

### Web layer (`app/index.html` — the entire app)

The file is ~508 lines structured as: `<style>` block (CSS for all 4 faces) → `<body>` markup (4 face sections + nav) → `<script>` IIFE (all logic). No framework, no modules, no build step.

**`FACES` array** (~line 312) is the source of truth: each entry is `{ id, name, theme }`.

| id    | Name        | Font     | Theme |
|-------|-------------|----------|-------|
| face1 | Minimal     | Jost     | Light — warm paper (#ECE9E1) |
| face2 | Retro Flip  | Archivo  | Dark — mechanical flip animation |
| face3 | Typography  | Anton    | Light — large editorial poster |
| face4 | Neon        | Orbitron | Dark — cyan/magenta glow shadows |

Each face is a `#faceN` section with its own scoped CSS block; only `.active` is shown.

**Key functions:**

- **`go(i)`** — switches faces, toggles `.active`/nav dots, sets `stage.dataset.theme`, persists to `localStorage`. Re-renders flip face without animation on entry.
- **`tick()`** — updates all 4 faces with current time (h12, mm, ss, ampm, date strings). Uses DAYS/DAYS3/MON/MON3 constant arrays for full and 3-letter weekday/month.
- **`loop()`** — drives `tick()` on the second boundary: `setTimeout(loop, 1000 - Date.now() % 1000)` instead of `setInterval`, so seconds never drift.
- **`fitActive()` / `fitEl()`** — scale content to fill the viewport. Faces are sized in `vmin`, which reads small on ultra-wide screens (target: Galaxy Z Fold cover display, ~2316×904). `fitEl` computes a scale factor from the actual bounding box so content fills ~92% of the screen without overflow. Re-runs on resize, font load, and when the hour digit count changes (1- vs 2-digit hours).
- **Flip clock** (`buildFlip` / `setCard` / `setGroup`) — CSS split-flap animation driven by `animationend` events. Each digit has fold (0.3 s) + unfold (0.3 s) phases. Only animates while `face2` is active.
- **Nav idle-hide** — shows on any touch/mouse/key event, auto-hides after 4 s.
- **SW cleanup** — on first load, unregisters any stale service worker (SW was removed to prevent stale-cache bugs in the bundled APK).
- **`prefers-reduced-motion`** — flip animation is suppressed when the system accessibility setting is on.

**Navigation:** tap/click → next face; ← / → arrow keys → prev/next face; dot click → jump to specific face.

### Native layer

**`MainActivity.java`** (extends Capacitor's `BridgeActivity`):
- `FLAG_KEEP_SCREEN_ON` — prevents auto-sleep for always-on desk display
- Forces black background on decor window and WebView so cutout/letterbox areas never flash white
- Immersive fullscreen via `WindowInsetsControllerCompat` (system bars hidden, swipe-down to reveal); re-applied on `onWindowFocusChanged`
- Landscape only **while foregrounded**: `onResume` → `SCREEN_ORIENTATION_SENSOR_LANDSCAPE`; `onPause` → `SCREEN_ORIENTATION_UNSPECIFIED` (returns device to its prior orientation on exit)

**`DeskClockWidget.java`** (extends `AppWidgetProvider`):
- Home-screen widget whose `TextClock` self-updates from the system — no polling needed
- `onUpdate()` wires a click → launch `MainActivity` via `PendingIntent` (FLAG_IMMUTABLE)

**`AndroidManifest.xml`** declares: `MainActivity` (LAUNCHER, singleTask), `DeskClockWidget` (APPWIDGET_UPDATE receiver), `FileProvider` (Capacitor standard). Only permission: `INTERNET` (for potential Capacitor plugins; the app itself is offline).

## Conventions & gotchas

- **Fonts are bundled** as woff2 under `app/fonts/` and declared with `@font-face` — never link Google Fonts. Remote fonts broke flip-digit alignment offline and the app must work with no network.
- **No service worker** — assets are already local in the APK bundle; an SW only caused stale-cache bugs and was removed.
- **All measurements in `vmin`** in CSS — this is intentional for the foldable cover display target but means `fitEl()` must rescale on every layout change.
- **`sharp` is not in `package.json`** — `generate-icons.js` requires it but it must be installed manually before running.
- **`capacitor.config.json`** sets `android.backgroundColor: "#000000"` — keeps the native container black matching the web app.
- Code comments and commit messages are in **Korean**; match that style.
- Per-face design spec (colors, spacing, animation timing) lives in `docs/DESIGN.md` — consult it before changing any face's appearance.
