# Worklog — 2026-06-17 (Desk Clock)

오늘 Desk Clock(시계 페이스 + APK + 에이전트/툴링) 작업 정리.

## 요약

- 시계 페이스를 **네오 브루탈리즘 4종 → 8종 → 10종 → 최종 9종**으로 정비.
- 신규 페이스 2종 추가: **Apple Liquid Glass**, **Terminal**.
- 브루탈 시리즈의 **빨간 배경 Flip 제거**(중복/취향 정리), 클래식 Retro Flip은 유지.
- 변경분을 디버그 APK로 빌드해 실기기 2대에 설치·확인.
- `apk-build-installer` 에이전트 정의를 **포그라운드 빌드 보장**으로 강화하고, 완료 시 **Slack 보고**를 추가(한글 인코딩 이슈까지 수정).

## 페이스 변경 타임라인 (main)

| 시각 | 커밋 | 내용 |
|------|------|------|
| 23:37* | `4a9a222` | 4개 페이스에 네오 브루탈리즘 디자인 적용 (feat/neo-brutalist-ui → main cherry-pick) |
| 21:52 | `09e8e7b` | 8종 구성 — 브루탈리즘 4종 + 클래식 원본 4종 복원 |
| 22:03 | `50d923b` | 2종 추가 — Apple Liquid Glass · Terminal (총 10종) |
| 23:09 | `3f018be` | 브루탈 시리즈에서 빨간 배경 Flip 제거 (총 9종) |
| 23:09 | `57eec4b` | (툴링) apk-build-installer 포그라운드·완료 보장 강화 |

\* cherry-pick 원본 시각. rebase 과정에서 해시가 `4a9a222`로 재작성됨.

## 최종 페이스 라인업 (9종)

브루탈리즘 시리즈
1. `face1` **Brutal Minimal** — 옐로우 배경 + 흰 박스 + 하드 그림자
2. `face3` **Brutal Type** — 흰 배경 + 핫핑크 하드 오프셋
3. `face4` **Brutal Electric** — 딥 네이비 그리드 + 라임/블루 솔리드 블록

클래식 시리즈
4. `face5` **Minimal** — 웜 그레이 + 라이트 웨이트
5. `face6` **Retro Flip** — 둥근 카드 + 드롭섀도 플립
6. `face7` **Typography** — Anton 대형 + 레드 악센트
7. `face8` **Neon** — 네온 글로우

신규
8. `face9` **Liquid Glass** — 움직이는 컬러 블롭 + `backdrop-filter` 프로스티드 글래스 + 스페큘러 광택
9. `face10` **Terminal** — 검은 배경 + 초록 모노스페이스 + CRT 글로우/스캔라인 + 깜빡이는 블록 커서 (24h HH:MM:SS)

> 제거됨: `face2` Brutal Flip(빨간 배경). 플립 공유 인프라(`.flip-group`/`.flip-card`/`@keyframes`)는 클래식 `face6`가 쓰므로 유지.

## 구현 메모

- 모든 페이스는 단일 `app/index.html`에 CSS/HTML/JS로 구현. 페이스 순환·dot·영속화(`localStorage`)·`fitActive` 자동 확대는 페이스 수에 맞춰 자동 확장.
- 플립 카드 구조는 `face2`(브루탈)와 `face6`(클래식)이 공유 → `face6`는 `#face6` 스코프 오버라이드로 둥근/그림자 룩 복원. `face2` 제거 후 `renderFlip()`은 인덱스 대신 **id 기반(`face6`)** 으로 변경해 인덱스 이동에 안전.
- `Liquid Glass`/`Terminal` 모두 `prefers-reduced-motion` 시 애니메이션 정지.
- Terminal은 번들 모노 폰트가 없어 시스템 모노 스택(`ui-monospace, Cascadia Mono, Consolas, Courier New`) 사용 — Android WebView에서 정상 렌더.

## 빌드 / 디바이스 설치

- 스택: Capacitor 8, App ID `com.precipi.deskclock`, `webDir: app`. 산출물 `android/app/build/outputs/apk/debug/app-debug.apk`.
- 절차: `npx cap sync android` → `gradlew assembleDebug` → `adb install -r` → 런처 실행.
- 설치 확인 기기:
  - **R5KL307VAST** (10종 빌드)
  - **R3CW70S1DZZ** (SM-F946N / Galaxy Z Fold5) — 10종 및 최종 9종 빌드 확인.

## 에이전트 / 툴링

- **apk-build-installer 강화** (`57eec4b`): gradle 빌드를 **항상 포그라운드로 완료까지** 실행하고, `run_in_background`/빌드 중 턴 종료를 금지하도록 정의에 명시. (이전에 빌드를 백그라운드로 띄우고 완료 전 종료해 stale APK가 설치되던 문제 방지.)
- **배포 완료 Slack 보고** (에이전트 프로젝트 메모리, gitignore): 빌드+설치 후 webhook으로 결과 요약 POST. 시크릿은 `.claude/agent-memory/`(=gitignore)에만 보관.
  - **한글 인코딩 수정:** Git Bash가 네이티브 `curl.exe`에 한글을 **인자**로 넘기면 MSYS 재인코딩으로 깨짐 → **stdin(`--data-binary @-`) + `charset=utf-8`** 방식으로 변경해 해결.

## 후속 / TODO

- (관련) precipi-web 웹 데모·APK는 별도 배포 파이프라인에서 9종 기준으로 갱신됨(이 레포 범위 밖).
- 신규 페이스 2종은 Fold5 커버/메인 화면 등 특수 화면비에서의 `fitActive` 추가 확인 권장.
