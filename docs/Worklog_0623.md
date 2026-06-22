# Worklog — 2026-06-23 (Desk Clock)

오늘은 **소나 기능 두 가지를 개선**했다: ① 진입 버튼에 실시간 재실 상태 LED 추가, ② 네이티브 레벨에서 소나 자동 시작(무터치) 지원.

## 요약

- **소나 버튼 LED 표시** — 우측 하단 `SONAR` 진입 버튼 안에 상태 LED 추가. 사람 있음(초록) / 없음(빨강) / 감지 전·캐리어 미포착(회색) 세 가지 상태를 실시간 반영.
- **소나 자동 가동(무터치)** — 기존 브라우저 autoplay 정책으로 첫 터치 이벤트가 있어야 소나가 시작됐던 것을, 네이티브+JS 양쪽에서 수정해 앱 로드 직후 자동 시작되도록 변경.
- 디버그 APK 빌드 후 단말(R3CW70S1DZZ) 설치·실행하여 동작 확인 완료.

## 1. 소나 버튼 — 상태 LED 아이콘

**목표:** 시계 화면에서 소나 PoC 페이지로 가지 않아도 현재 재실 감지 상태를 한눈에 확인.

**변경 내용 (`app/index.html`)**

- `.sonar-link` CSS: `padding: 15px → 22px`, `display: inline-flex`, `gap: 7px`, `align-items: center`로 버튼을 좌우로 넓히고 내부를 플렉스 배치.
- `.sonar-led` CSS: `width/height: 8px` 원형, `border-radius: 50%`, `flex-shrink: 0`. 색상은 JS에서 동적 교체.
- 버튼 마크업에 `<span class="sonar-led" id="sonarLed"></span>` 추가.
- 소나 감지 루프에 `setLed()` 함수 연결 — 판정 상태가 바뀔 때마다 LED 색 갱신.

**LED 상태 정의**

| 상태 | 색 | 조건 |
|------|----|------|
| PRESENCE | `#2ecc40` (초록) | 최근 `PRESENCE_HOLD`(3 s) 내 움직임 감지 |
| NO PRESENCE | `#ff4136` (빨강) | 캐리어 포착됐으나 3 s 내 움직임 없음 |
| 대기 / NO SIGNAL | `#888` (회색) | 소나 미시작 또는 캐리어 미포착 |

디밍 판정(10분 지연)과 LED 판정(3초 홀드, `PRESENCE_HOLD`)은 **독립 타이머**로 분리. 도플러 특성상 완전 정지 시 움직임이 없으면 빨강이 될 수 있음(설계상 정상).

## 2. 소나 자동 가동 (무터치)

**문제:** 브라우저 autoplay 정책 — WebAudio API(`AudioContext` 생성·`getUserMedia`) 는 사용자 제스처(포인터/키보드 이벤트) 없이는 실행이 차단됨. 기존 코드는 `pointerdown`/`keydown` 리스너에서 소나를 시작.

**해결 1 — 네이티브 (`android/app/src/main/java/com/precipi/deskclock/MainActivity.java`)**

```java
webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
```

Capacitor `WebView`에 위 설정을 추가해 WebView 레벨에서 제스처 요건을 해제.

**해결 2 — 웹 (`app/index.html`)**

- 앱 로드 직후(`DOMContentLoaded` / IIFE 말미) `start()` 자동 호출.
- 실패 시(권한 팝업 대기, 초기화 지연 등) **1초 간격 최대 20회 재시도** (`startRetries` 카운터).
- 제스처 리스너(`pointerdown`/`keydown`)는 재시도 모두 실패했을 때의 **보조 폴백**으로 유지.

**예외:** 마이크 `RECORD_AUDIO` 권한은 최초 1회 OS 팝업에서 사용자가 허용해야 함 — OS 레벨이므로 우회 불가. 허용 이후에는 무터치 자동 시작.

## 3. 빌드 · 설치

- `npx cap copy android` → `gradlew.bat assembleDebug` → `adb -s R3CW70S1DZZ install -r app-debug.apk` → 런처 실행.
- 단말 **R3CW70S1DZZ** (SM-F946N / Galaxy Z Fold5) 에서 동작 확인.

## 배운 점

- **`setMediaPlaybackRequiresUserGesture(false)` 위치가 중요** — `super.onCreate()` 이후, `getBridge().getWebView()` 로 Capacitor가 생성한 WebView 인스턴스에 적용해야 한다. 새 WebView를 만들면 Capacitor 브리지와 분리돼 아무 효과가 없음.
- **LED와 디밍 타이머 분리** — 두 판정이 같은 카운터를 공유하면 디밍 민감도 조정 시 LED 반응도 같이 바뀌어 UX 혼선. 목적이 다른 타이머는 처음부터 독립 변수로 분리하는 것이 유지보수에 유리.
- **재시도 횟수 캡(`startRetries`)** — 무한 루프 방지. 권한이 영구 거부된 단말에서 계속 재시도하면 불필요한 오디오 컨텍스트 생성 시도가 누적될 수 있음.

## 내일 할 일

- [ ] Fold5 저볼륨 환경에서 절대 사이드밴드 지표로 등속 움직임이 잡히는지 재검증 (0622 TODO 1순위).
- [ ] 소나 버튼 LED가 시계 페이스별(밝은 배경/어두운 배경) 모두에서 잘 보이는지 색상 대비 확인.
- [ ] 마이크 권한 영구 거부 시 UX 안내 문구 검토 (재시도 소진 후 빈 상태로 남는 것 개선).
- [ ] 듀티 모드 + 자동시작 조합에서 온셋 과도현상 오검출 여부 확인.

## 변경 파일

- `app/index.html` — `.sonar-link` / `.sonar-led` CSS, `<span id="sonarLed">` 마크업, `setLed()` 함수, 자동 `start()` + `startRetries` 재시도 로직, 제스처 폴백 유지.
- `android/app/src/main/java/com/precipi/deskclock/MainActivity.java` — `setMediaPlaybackRequiresUserGesture(false)` 추가.
