# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An **offline Android desk-clock app**: a single HTML screen (`app/index.html`) wrapped in a Capacitor WebView. No network, no backend, no build step for the web layer — the `app/` directory ships as-is. Touching the screen (or ← / → keys) cycles through 4 clock faces; the selected face persists in `localStorage` (`deskclock.face`).

App id: `com.precipi.deskclock` · Capacitor `webDir` is `app/`.

## Build & install

Requires Node.js, JDK 17+, and Android SDK.

```bash
npm install                       # install Capacitor CLI/deps
npx cap copy android              # sync app/ web assets into the native project
./android/gradlew.bat -p android assembleDebug   # build (Windows; use ./gradlew on *nix)
# output: android/app/build/outputs/apk/debug/app-debug.apk

# install + launch on a connected device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.precipi.deskclock -c android.intent.category.LAUNCHER 1
```

**Always run `npx cap copy android` after editing anything under `app/`** — Gradle builds from the copied assets in `android/app/src/main/assets/public`, not from `app/` directly.

`android/local.properties` is gitignored and must point at the SDK (`sdk.dir=...`); without it Gradle fails with "SDK location not found". On this machine the SDK is at `C:\Users\seung\AppData\Local\Android\Sdk`.

There are no tests, linters, or web bundler — `package.json` has no scripts.

## Architecture

**`app/index.html` is the entire app** (~520 lines: HTML + CSS + vanilla JS in one file, no framework, no modules). Key pieces:

- **`FACES` array** (~line 327) is the source of truth: each entry is `{ id, name, theme }`. `face1` Minimal, `face2` Retro Flip, `face3` Typography, `face4` Neon. Each face is a `#faceN` section with its own scoped CSS block; only `.active` is shown.
- **`go(i)`** switches faces, toggles `.active`/nav dots, sets `stage.dataset.theme`, and persists to `localStorage`. The flip face is re-rendered without animation on entry.
- **`tick()` + `loop()`** drive time. `loop()` re-aligns to the second boundary each tick (`setTimeout(loop, 1000 - Date.now()%1000)`) instead of a fixed `setInterval`, so seconds don't drift.
- **`fitActive()` / `fitEl()`** scale content to fill the viewport. Faces are sized in `vmin`, which looks small on ultra-wide screens (the target is the Galaxy Z Fold cover display, ~2316×904). `fitEl` measures the real bounding box and computes a scale factor so content fills without overflowing — re-run on resize, font load, and when the hour's digit count changes.
- **Flip clock** (`buildFlip`/`setCard`/`setGroup`) is a CSS split-flap animation driven by `animationend` events; only animates while `face2` is active.

**Native layer is intentionally thin.** `MainActivity.java`:
- `FLAG_KEEP_SCREEN_ON` (always-on desk display) and forces a black decor/WebView background so cutout/letterbox areas never flash white.
- Immersive fullscreen via `WindowInsetsControllerCompat` (hides system bars, swipe to reveal), re-applied on `onWindowFocusChanged`.
- Landscape only **while the app is foregrounded**: `onResume` sets `SENSOR_LANDSCAPE`, `onPause` resets to `UNSPECIFIED` so the device returns to its prior orientation on exit.

`DeskClockWidget.java` is a home-screen widget whose `TextClock` self-updates from the system; the provider only wires a click → open `MainActivity`.

## Conventions & gotchas

- **Fonts are bundled** as woff2 under `app/fonts/` and declared with `@font-face` — never link Google Fonts. Remote fonts broke flip-digit alignment offline and the app must work with no network.
- **No service worker** — assets are already local in the bundle; an SW only caused stale-cache bugs and was removed.
- Code comments and commit messages are in **Korean**; match that style.
- App icons: edit `generate-icons.js`, then `node generate-icons.js` and `npx capacitor-assets generate --android`.
- Per-face design spec (colors, spacing, animation timing) lives in `docs/DESIGN.md`.
