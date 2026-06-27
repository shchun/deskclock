# Worklog — 2026-06-27 (Desk Clock)

오늘은 **폴드 단말 전용 3D 착시 시계 페이스 3종(face12~14)** 을 신규 추가했다. `precipi-web/3d-fold` 브랜치의 off-axis 아나모픽 기법을 이식해, 화면을 90°로 접으면 공중에 뜬 것처럼 보이는 입체 착시 효과를 구현했다. 변경 파일은 `app/index.html` (+520줄), `android/app/.../MainActivity.java` (+46줄), `docs/DESIGN.md` (+20줄).

---

## 1. three.js 오프라인 번들 및 엔진 구조

- **three.js r160** 을 `app/vendor/three.module.js` 로 오프라인 번들. `FontLoader.js`, `TextGeometry.js`, `helvetiker_bold.typeface.json` 도 동일 경로로 복사.
- 각 애드온의 `import` 경로를 `'three'` → `'./three.module.js'` 로 패치 (APK 오프라인 환경에서 모듈 해석 오류 방지).
- `app/index.html` 에 `<script type="module">` 3D 엔진 블록 추가.
  - **듀얼 뷰포트 렌더**: 캔버스를 상단(벽면)·하단(바닥면) 두 영역으로 분할, 각각 별도 카메라로 Kooima 일반화 원근(off-axis projection) 적용 → 90° 접힌 폴드 화면에서 하나의 연속 입체로 인식.
  - 공유 오버레이 `#fold3d-stage` (WebGL 캔버스 + 크레이즈 가이드라인 + 안내 문구)를 별도 레이어로 배치, `#face12~14` 섹션은 투명 마커로만 존재.
  - 비폴드 단말에서는 경첩 센서 부재를 감지해 face12~14를 FACES 레지스트리에 등록하지 않음 → 페이지 전환 대상 없음.
  - 메인 IIFE에 `window.__deskAddFace(faceObj)` 훅 노출 → 모듈 스크립트가 런타임에 face를 동적 등록.

## 2. 폴드 감지 + 경첩 각도 (네이티브 브리지)

- `MainActivity.java` 에 `Sensor.TYPE_HINGE_ANGLE` 리스너 추가.
  - `onSensorChanged` 에서 각도(deg)를 읽어 `window.__foldHinge(deg)` 자바스크립트 콜백으로 전달.
  - 웹 측에서 이 값을 받아 벽 평면 기울기를 실제 경첩 각도로 실시간 보정.
- DeskClock 브리지에 `isFoldable()` / `hingeAngle()` 메서드 추가.
  - 경첩 센서 존재 여부 → 폴드 단말 판별 신호 → face12~14 노출 결정.

## 3. 관찰자 물리 모델 수정

- 내부 디스플레이 폭 ~148 mm 기준으로 `MM_PER_UNIT ≈ 74` 상수 설정, 월드 단위계를 mm 스케일로 고정.
- 관찰자 위치: 화면 중앙에서 **50 cm, 45° 내려다보는 시점** 을 절대 월드좌표로 계산.
- 이전 근접 과장 원근(~10 cm 가정) 대비 원근 왜곡이 크게 줄어 실기기에서 자연스러운 입체감 확인.

## 4. 3종 폴드 페이스 구현

| id | 이름 | 핵심 요소 |
|----|------|-----------|
| face12 | Fold Neon | 공중에 뜬 압출 7-세그먼트 네온 숫자 + 바닥 빛 웅덩이(PointLight 반사) |
| face13 | Fold Solid | TextGeometry(helvetiker_bold) 입체 글자, 광택 MeshStandardMaterial, 중심을 화면 세로 중앙 정렬 |
| face14 | Fold Analog | 네온 다이얼 + 12눈금 + 시침·분침(흰색) + 초침(마젠타), 초침 매 프레임 실시간 스윕 |

- face12·13의 숫자/글자는 `tick()` 공유 `parts` 객체(`h12, mm, ss`)를 받아 매초 갱신.
- face14 초침은 `requestAnimationFrame` 루프에서 `Date.now() % 60000 / 60000 * 2π` 로 부드럽게 회전.

## 5. 튜닝 — 실기기 반복 검증 (Galaxy Z Fold, R3CW70S1DZZ)

- 숫자·글자 크기 축소: 초기 렌더에서 화면 밖으로 튀어나오던 문제 수정.
- face13 TextGeometry 수직 위치 조정: bounding box 중심을 화면 세로 중앙에 정렬.
- 안내 문구를 하단으로 이동: 상단 배치 시 투명 탭 영역(페이스 전환 컨트롤)과 겹쳐 터치 방해.
- 빌드(`gradlew assembleDebug`) → `adb install -r` → 스크린샷 확인 사이클을 수회 반복, 최종 JS 에러 없음.

## 6. DESIGN.md 문서화

- `docs/DESIGN.md` 에 **face12 Fold Neon** · **face13 Fold Solid** 스펙 섹션 추가.
  - 관찰자 모델(거리·각도·`MM_PER_UNIT`), off-axis 카메라 파라미터, 각 face의 재질·조명 설정 기술.

---

## 배운 점

- **off-axis 원근의 핵심은 관찰자 거리 스케일** — `near plane` 크기를 실제 화면 물리 치수(mm)와 맞춰야 과장 없는 자연스러운 착시가 나온다. `~10 cm` 근거리로 잡으면 원근이 지나치게 과장되고, 실제 시청 거리(50 cm)에 맞추니 바로 해결됐다.
- **`<script type="module">` 과 IIFE의 공존** — 모듈 스크립트는 defer 실행이므로 IIFE가 먼저 실행된다. `window.__deskAddFace` 훅을 IIFE 초기화 단계에서 등록해두면 모듈이 뒤늦게 실행돼도 안전하게 face를 주입할 수 있다.
- **경첩 센서 존재 = 폴드 판별 신호** — `Sensor.TYPE_HINGE_ANGLE` 을 `getDefaultSensor()` 로 조회해 `null` 여부로 폴드 여부를 판단하는 방식이 가장 단순하고 신뢰성 높다. API 레벨 추가 조건 없이도 동작.
- **TextGeometry bounding box 정렬은 수동으로** — three.js TextGeometry 생성 직후 `computeBoundingBox()` → `box.getCenter(offset)` → `geometry.translate(-offset.x, -offset.y, 0)` 패턴이 필수. 하지 않으면 글자가 왼쪽 아래 기준으로 배치된다.
- **오프라인 번들 경로 패치** — npm 패키지 `three/addons` 경로는 APK WebView에서 해석 안 됨. 소스를 직접 복사하고 상대 경로(`./three.module.js`)로 재지정하는 것이 유일한 방법.

---

## 내일 할 일

- [ ] face14 Fold Analog 시·분침 각도 계산 실기기 정밀 검증 (오늘은 초침 위주 확인).
- [ ] face12 바닥 빛 웅덩이 색상·강도 튜닝 (현재 기본값, 실내 조명 환경에서 대비 약함).
- [ ] CLAUDE.md FACES 표에 face12~14 항목 추가.
- [ ] `window.__deskAddFace` 훅에 대한 주석 보완 (비폴드 단말 폴백 동작 명시).
- [ ] 0625 이월: face2·face3 콜론 깜빡임 연속성 확인.
- [ ] 0623 미완료: 마이크 권한 영구 거부 시 UX 안내 문구 개선.

---

## 변경 파일

- `app/index.html` — `<script type="module">` 3D 엔진 추가, `window.__deskAddFace` 훅, face12~14 마커 섹션 (+520줄).
- `app/vendor/three.module.js` — three.js r160 오프라인 번들 (신규).
- `app/vendor/FontLoader.js`, `TextGeometry.js` — three.js 애드온, 경로 패치 (신규).
- `app/vendor/helvetiker_bold.typeface.json` — face13 TextGeometry 폰트 (신규).
- `android/app/src/main/java/com/precipi/deskclock/MainActivity.java` — `TYPE_HINGE_ANGLE` 센서 리스너, `window.__foldHinge` 브리지 (+46줄).
- `docs/DESIGN.md` — face12·13 스펙·관찰자 모델 섹션 추가 (+20줄).
