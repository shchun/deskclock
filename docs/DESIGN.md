# Handoff: Desk Clock (4 cycleable designs)

## Overview
A full-screen desk clock that shows the current time and lets the user cycle between **4 visual designs**. Time is 12-hour format with an AM/PM indicator, plus the weekday and date. The chosen design persists across reloads. There are no other features — this is intentionally a single-purpose clock.

## About the Design Files
The file in this bundle (`Desk Clock.html`) is a **design reference created in HTML** — a working prototype that demonstrates the intended look and behavior. It is **not** production code to paste in directly. The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI, native, a screensaver target, etc.) using that project's established patterns. If no codebase exists yet, pick the most appropriate framework and implement the designs there.

The prototype uses vanilla HTML/CSS/JS with `setTimeout` ticking and Google Fonts. Adapt the structure to your stack — e.g. a `<Clock>` component with a `faceIndex` state and one sub-component per face.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are all specified below. Recreate pixel-faithfully, but feel free to substitute your codebase's own font-loading and state mechanisms.

## Core behavior (shared by all faces)
- **Tick:** update every second, aligned to the wall-clock second boundary (`setTimeout(loop, 1000 - Date.now()%1000)`).
- **Time format:** 12-hour. Hour `h12 = h % 12 || 12`. AM/PM string `h >= 12 ? 'PM' : 'AM'`.
- **Seconds:** zero-padded 2 digits (`08`).
- **Date strings:** weekday + month + day-of-month, no leading zero on the day. Examples used: full weekday `SUNDAY`, full month `JUNE`, 3-letter `SUN` / `JUN`. All uppercase.
- **Cycling:** 4 designs in a ring. Controls: ‹ / › arrow buttons, a row of 4 dots (click to jump), and keyboard ← / →. Index wraps modulo 4.
- **Persistence:** store the active face index in `localStorage` under key `deskclock.face`; restore on load (clamp to 0–3).
- **Layout:** each face fills the viewport and is centered. All sizing uses `vmin` so it scales to any screen. Switching is via `display:none` ↔ `display:flex` (NOT opacity), with a transform-only entrance animation (`scale(1.03) → scale(1)`, 0.55s) so the active face is always visible even if animation is throttled.

## Faces / Views

There are 4 faces. Each declares a `theme` of `light` or `dark`, which drives the nav control color.

### Face 1 — Minimal / Modern  (theme: light)
- **Background:** `#ECE9E1` (warm paper). **Text:** `#1b1a16`.
- **Font:** Jost.
- **Layout:** centered vertical stack, `gap: 5.5vmin`.
  - **Date** (top): `SUNDAY · JUNE 14`, weight 400, `2.1vmin`, `letter-spacing: .55em`, uppercase, color `#8c887c`, `white-space:nowrap`.
  - **Clock row** (flex, align top, `gap: 1.6vmin`):
    - **Time** `9:42` (h12 + ":" + mm, no leading zero on hour): Jost weight **200**, `font-size: 24vmin`, `letter-spacing: -.01em`, tabular-nums.
    - **Side column** (offset down with `padding-top: 3vmin`, `gap: 1.4vmin`):
      - **Seconds** `21`: Jost 300, `5.2vmin`, color `#b3afa2`, tabular-nums.
      - **AM/PM** `AM`: Jost 400, `2.6vmin`, `letter-spacing: .4em`, color `#1b1a16`.
  - **Hairline rule** (bottom): `30vmin` wide, `1px`, color `#cdc9bd`.

### Face 2 — Retro Flip  (theme: dark)
A mechanical split-flap flip clock with a real fold/unfold animation.
- **Background:** `radial-gradient(120% 90% at 50% 0%, #202024 0%, #141416 55%, #0e0e10 100%)`. **Text:** `#f3f1ea`.
- **Font:** Archivo 700.
- **Layout:** vertical stack, `gap: 4.2vmin`.
  - **Clock row** (flex, align center, `gap: 1.6vmin`): hours group, blinking colon, minutes group, small seconds group.
    - **Flip groups:** hours (2 digits, `09`), minutes (2 digits), seconds (2 digits). Hours show a **leading zero**. Seconds group is scaled `0.5` (`transform: scale(.5)`, origin center bottom).
    - **Colon:** two dots stacked, each `1.5vmin` circle, color `#56565c`, `gap: 4vmin` between them; **blinks** 50% opacity on a 1s `steps(1,end)` loop.
  - **Meta row** (flex, `gap: 2.4vmin`):
    - **AM/PM pill** `PM`: Archivo 600, `2.4vmin`, `letter-spacing: .25em`, padding `.9vmin 1.8vmin`, radius `.8vmin`, background `#26262b`, text color **`#f3b14e`** (amber), soft shadow.
    - **Date** `SUN · JUN 14`: weight 400, `2.2vmin`, `letter-spacing: .4em`, color `#9a968c`, uppercase, nowrap.
- **Flip card geometry:** width `13vmin`, height `18vmin`, font-size `14vmin`, `perspective: 340px`, radius `1.4vmin`, drop-shadow `0 1.4vmin 2.6vmin rgba(0,0,0,.45)`.
  - **Card halves:** top half background `#2b2b30` with a `1px solid rgba(0,0,0,.45)` bottom seam; bottom half background `#202024`. Each half is `height:50%; overflow:hidden`. The digit (`.num`) is absolutely positioned at full card height (`18vmin`, line-height `18vmin`); top halves anchor `top:0`, bottom halves anchor `bottom:0` — this clips each half to show the correct portion of the glyph. **Do not** use flex centering + translateY here (it causes the glyph to clip to only the top half — a bug we hit and fixed).
  - **Animation (on digit change):** an upper flap folds down `rotateX(0 → -90deg)` over `0.3s ease-in` showing the OLD digit; then a lower flap unfolds `rotateX(90deg → 0)` over `0.3s ease-out` (0.3s delay) showing the NEW digit. On `animationend`, commit the new value to the static bottom half and top flap. `backface-visibility:hidden` on the flaps. Only animate the currently-visible face; set digits instantly (no animation) when switching to this face.

### Face 3 — Typography  (theme: light)
Editorial big-type poster.
- **Background:** `#E7E2D6`. **Text:** `#15130d`. **Accent:** `#cf3f23` (vermilion).
- **Font:** Anton (single weight).
- **Layout:** full-bleed relative container, time centered; satellites absolutely positioned.
  - **Time** `9:41` (no leading-zero hour): Anton, `font-size: 40vmin`, `line-height: .82`, `letter-spacing: -.02em`, tabular-nums.
  - **AM/PM** `AM`: absolute `top:18% right:9%`, Anton `9vmin`, color `#cf3f23`.
  - **Date** `SUNDAY  JUN 14` (full weekday + 3-letter month + day): absolute `left:9% bottom:11%`, **vertical** (`writing-mode: vertical-rl; transform: rotate(180deg)`), Anton `4.4vmin`, `letter-spacing:.06em`, color `#15130d`, uppercase.
  - **Seconds** `33`: absolute `right:9% bottom:11%`, Anton `7vmin`, color `#cf3f23`, tabular-nums.

### Face 4 — Neon / Glow  (theme: dark)
- **Background:** `radial-gradient(120% 120% at 50% 42%, #0d1320 0%, #060810 60%, #030308 100%)`.
- **Font:** Orbitron 700.
- **Layout:** vertical stack, `gap: 4vmin`.
  - **Clock** (flex, align baseline, `gap: 1vmin`):
    - **Time** `9:41`: `24vmin`, color `#d6fbff`, cyan glow `text-shadow: 0 0 .6vmin #aef6ff, 0 0 1.6vmin #4fe9ff, 0 0 4vmin #16b6ff, 0 0 8vmin #0a86e0`. The colon character blinks (50% opacity, 1.1s `steps(1,end)`).
    - **AM/PM** `AM`: Orbitron 500, `5vmin`, aligned to top (`margin-top: 2vmin`), color `#ffd2f4`, magenta glow `0 0 .6vmin #ff9be8, 0 0 2vmin #ff4fd0, 0 0 5vmin #e018b0`.
  - **Meta row** (flex, `gap: 2.6vmin`):
    - **Seconds** `34`: Orbitron 400, `3vmin`, color `#bff0ff`, glow `0 0 .5vmin #7fe8ff, 0 0 2vmin #29c6ff`.
    - **Dot separator:** `1vmin` circle, `#5fe0ff`, `box-shadow: 0 0 1.4vmin #29c6ff`.
    - **Date** `SUNDAY · JUNE 14`: Orbitron 400, `2.3vmin`, `letter-spacing: .34em`, color `#8fb6cf`, uppercase, nowrap.

## Nav control (shared)
- Fixed, bottom-center, `bottom: 4.5vmin`. Pill shape, translucent `backdrop-filter: blur(8px)` background.
- Contents: ‹ button, 4 dots, › button. **No text labels** (design names are intentionally omitted).
- Buttons min 30×30px hit area. Dots `1vmin` (min 8px); active dot uses full theme color and `scale(1.3)`.
- **Theme-aware colors** via CSS vars set on the stage per active face:
  - light → `--ui: #1b1a16`, `--ui-soft: rgba(27,26,22,.42)`, `--ui-bg: rgba(27,26,22,.06)`
  - dark → `--ui: #f3f1ea`, `--ui-soft: rgba(243,241,234,.5)`, `--ui-bg: rgba(243,241,234,.1)`
- **Auto-hide:** fade the nav out after 4s of no `mousemove`/`touchstart`/`keydown`; reveal on any of those (or on hover).

## Interactions & Behavior
- Arrow buttons → prev/next face (wrap). Dots → jump to face. Keyboard ←/→ → prev/next.
- On switching to the flip face, render its digits instantly (no flip animation) so it doesn't animate from stale values.
- Colons blink once per second/1.1s. Seconds update every second on every face.
- Entrance animation per face is transform-only (scale) — never gate visibility on an opacity animation (it can freeze invisible in throttled/background render contexts).

## State Management
- `activeFace: 0..3` — current design; persisted to `localStorage["deskclock.face"]`.
- `now: Date` — re-read each tick; derive `h12`, `mm`, `ss`, `ampm`, weekday, month, day.
- For the flip face, track the previous displayed value per digit to know whether to animate.

## Design Tokens
**Colors**
- Minimal: bg `#ECE9E1`, text `#1b1a16`, muted `#8c887c` / `#b3afa2`, rule `#cdc9bd`
- Flip: bg gradient `#202024→#141416→#0e0e10`, card top `#2b2b30`, card bottom `#202024`, text `#f3f1ea`, amber `#f3b14e`, muted `#9a968c`, dots `#56565c`
- Typography: bg `#E7E2D6`, text `#15130d`, accent `#cf3f23`
- Neon: bg gradient `#0d1320→#060810→#030308`, cyan text `#d6fbff` (glows `#aef6ff/#4fe9ff/#16b6ff/#0a86e0`), magenta `#ffd2f4` (glows `#ff9be8/#ff4fd0/#e018b0`), seconds `#bff0ff`, date `#8fb6cf`, dot `#5fe0ff`
- Nav: see theme vars above

**Typography**
- Jost (200/300/400) — Minimal & nav
- Archivo (600/700) — Flip
- Anton — Typography
- Orbitron (400/500/700) — Neon
- All from Google Fonts. Numeric displays use `font-variant-numeric: tabular-nums`.

**Spacing / radius / motion**
- All measurements in `vmin` (see per-face specs). Card radius `1.4vmin`; AM/PM pill radius `.8vmin`; nav pill fully rounded.
- Flip fold/unfold 0.3s + 0.3s; face entrance 0.55s `cubic-bezier(.2,.7,.2,1)`; colon blink 1s / 1.1s `steps(1,end)`.

## Assets
None — no images or icons. Glyphs (‹ › and dots) are text/CSS. Fonts load from Google Fonts.

## Files
- `Desk Clock.html` — the complete reference prototype (all 4 faces, nav, ticking, persistence). Included in this bundle.

## Notes
- `prefers-reduced-motion: reduce` disables the entrance animation; honor it in the rebuild.

## FACE 12·13 — Fold 3D (입체 디지털, 폴드 단말 전용)

유일한 WebGL/3D 페이스 쌍. 두 페이스(**face12 네온 / face13 솔리드**)는 **같은 off-axis 엔진과 공유 오버레이(`#fold3d-stage`)**를 쓰고 스타일만 다르다. 폴드 단말로 감지되면 둘 다 등록된다. 섹션(`#face12`/`#face13`)은 빈 투명 마커이고 실제 렌더는 공유 캔버스가 담당(중앙정렬·`fitActive` 우회).

- **face12 Fold Neon**: 공중에 뜬 압출 7-세그먼트 네온 숫자(시안). 바닥 빛 웅덩이 + 위아래 부유.
- **face13 Fold Solid**: 바닥에 선 솔리드 입체 숫자(three `TextGeometry`, helvetiker_bold 번들 폰트). 광택 `MeshPhysicalMaterial`(환경맵 반사) + 바닥 미러 반사. 접지된 '실체' 느낌.

**관찰자 모델(중요)**: 월드 좌표는 화면 폭에 상대적(x ∈ [-1,1] = 디스플레이 폭). 내부 디스플레이 폭 ≈148mm 가정 → `MM_PER_UNIT≈74`. 관찰자는 **50cm 바깥, 45° 위**에서 봄(`VIEW_DIST_MM=500`, `VIEW_ELEV=45°`). 시점을 실제 거리에 맞춰야(근접 과장 원근 제거) 아나모픽 착시가 정확하다. 단말 폭 가정이 틀리면 `MM_PER_UNIT`만 조정.

(이하 face12 세부)

- **착시 원리(anamorphic / fish-tank)**: 화면을 상단 절반=수직 '벽', 하단 절반=수평 '바닥' 두 뷰포트로 나눠, 단일 시점(eye)에서 off-axis(Kooima 일반화 원근) 카메라 2대로 같은 씬을 따로 렌더. 단말을 화면 정중앙(크레이즈)에서 90°로 접으면 두 수직 화면이 하나의 입체 공간으로 합쳐진다. 기법 출처: `precipi-web/3d-fold`.
- **오브젝트**: 공중에 뜬 압출 7-세그먼트 `HH:MM` 네온 숫자(시안 `#35e8ff`, 꺼진 세그먼트는 LED 패널 느낌의 dim). 콜론은 짝수 초에 점등. 가독성을 위해 전체 회전 대신 미세한 흔들림(±0.18rad)만 부여.
- **공간감**: 옅은 바닥/벽 그리드 + 밝은 크레이즈 선 + 별필드 + 바닥 글로우.
- **폴드 감지 → 조건부 등록**: 기본은 페이스 미존재. 네이티브 `window.DeskClock.isFoldable()`(경첩 센서 존재)가 참이거나, 웹 표준 `navigator.devicePosture`가 `folded`로 관측되거나, 경첩 각도 콜백이 오면 `window.__deskAddFace`로 FACES에 등록. **비폴드 단말엔 페이스 자체가 없다.**
- **경첩 각도 보정**: 네이티브 `Sensor.TYPE_HINGE_ANGLE` → `window.__foldHinge(deg)`. 벽 평면 방향을 `(0, sinθ, cosθ)`로 기울여(θ=경첩 각도) 90°가 아니어도 착시가 정확. 웹(센서 없음)에선 90° 고정.
- **렌더 게이팅**: rAF는 face12가 활성일 때만 — 진입 시 `Fold3D.setActive(true)`, 이탈 시 중단(배터리/성능).
- **에셋**: `app/vendor/three.module.js`(three r160 오프라인 번들). 7-세그먼트는 코드 생성이라 별도 폰트/타입페이스 JSON 불필요.
- **배치 상수**(코드 내 튜닝, L=각 절반의 월드 높이): 네온 `NEON_SCALE 0.50`, `PLACE.face12 {y:0.45·L, z:0.50·L}`, 빛 웅덩이 1.9. 솔리드 `SOLID_SCALE 0.80`, `PLACE.face13 {y:0(바닥), z:0.55·L}`. 시점은 위 관찰자 모델(50cm·45°)에서 절대 월드단위로 계산(`EYE_Y/EYE_Z`, ×L 아님).
- Respect the system clock / locale if you localize, but the reference deliberately uses English uppercase weekday/month with 12-hour AM/PM.
