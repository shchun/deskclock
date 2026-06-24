# Worklog — 2026-06-25 (Desk Clock)

오늘은 **기존 4개 face 코드를 데이터 주도 구조로 리팩터링**했다: tick() 스위치보드 제거, 수동 element ref 일괄 자동화, face별 HTML 재생성 제거, localStorage 키 전환. 변경은 단일 커밋 `ec61b64`으로 완료했고, Galaxy Z Fold5 커버 디스플레이에서 실기기 검증까지 마쳤다.

## 1. tick() 스위치보드 → 공통 parts 모델 + face별 render()

**기존 구조:** `tick()` 안에서 face별 분기(`if faceId === 'face1' … else if …`)가 나열되어 있었고, 각 분기마다 `document.getElementById()`로 개별 ref를 취득했다.

**변경 내용 (`app/index.html`)**

- `tick()` 실행 시 현재 시각을 **공통 `parts` 객체** 하나로 계산:
  ```js
  { h12, h24, mm, ss, ampm, date, day, mon, … }
  ```
- `FACES[]` 레지스트리에 각 face가 `render(parts, refs)` 함수를 등록.
- `tick()`은 `FACES[active].render(parts, refs)` 한 줄로 위임 → face를 늘려도 `tick()` 본체를 건드릴 필요 없음.

## 2. data-bind 자동 수집으로 수동 ref ~30개 제거

**기존:** 마크업·JS에 `getElementById('face1Hour')` 류의 하드코딩 ref가 ~30개.

**변경:** 마크업에 `data-bind="hour"` 같은 속성을 달고, 초기화 시 `FACES[].refs`를 `querySelectorAll('[data-bind]')`로 자동 수집. JS에서 id를 직접 참조하지 않으므로, 마크업 id를 바꿔도 JS 수정이 불필요.

## 3. fitActive() face id 분기 → FACES[].fit 설정 데이터화

**기존:** `fitActive()` 안에 `if (id === 'face2') { … } else { … }` 분기 하드코딩.

**변경:** `FACES[]` 각 항목에 `fit: { selector, targetRatio }` 필드 추가 → `fitActive()`는 `FACES[i].fit`을 읽기만 하면 됨. 분기 없는 단일 경로.

## 4. face별 innerHTML 재생성 제거 (콜론 깜빡임 연속성 확보)

**문제:** face4·8·9 등에서 `tick()`마다 해당 요소의 `innerHTML` 전체를 교체하고 있었음. 결과:
- 콜론 `<span>` 이 매초 DOM에서 제거·재삽입 → CSS `animation` 위상이 리셋되어 깜빡임 연속성 깨짐.
- HTML 파싱 비용이 매초 발생.

**해결:** 콜론·AMPM 마크업은 HTML에 **정적으로 고정**, `tick()`은 숫자 `textNode`만 갱신.

**검증 포인트 — 실기기 확인 항목:**

| 항목 | 확인 방법 | 결과 |
|------|-----------|------|
| 콜론 깜빡임 연속성 | face4 Neon에서 1분간 관찰, 위상 리셋 없음 | OK |
| Retro Flip 플립 애니메이션 | face2 진입 직후 및 분 바뀜 시점 | OK |
| 시 자릿수 전환 시 재스케일 | 1시→12시 또는 12시→1시 경계에서 `fitActive()` 발동 여부 | OK |
| 재시작 후 마지막 face 유지 | 앱 종료·재실행 후 localStorage `deskclock.face` id 기반 복원 | OK |

## 5. localStorage 키 전환 (배열 인덱스 → face id)

**기존:** `localStorage.setItem('deskclock.face', 2)` — 숫자 인덱스 저장.

**변경:** `localStorage.setItem('deskclock.face', 'face3')` — `id` 문자열 저장.
- face 순서가 바뀌어도 마지막 선택 face를 올바르게 복원.
- **구버전 폴백:** 저장값이 숫자이면 `FACES[parseInt(v)]?.id`로 변환, 앱 업데이트 후 첫 실행에서도 면 전환 없음.

## 6. 기술 스펙 문서화 (`docs/face-refactor-spec.html`)

`lavish-axi`(Kun Chen의 HTML 스펙 에디터, `npx lavish-axi`)로 리팩터링 계획을 인터랙티브 HTML 아티팩트로 작성·논의. **옵션 A(data-bind 자동 수집) + 부가 3건(fit 데이터화·innerHTML 고정·localStorage id 전환)** 을 채택하기로 확정. 산출물을 `docs/face-refactor-spec.html`로 커밋에 포함.

## 7. CLAUDE.md 갱신

- FACES 표: 4 face → 10 face로 업데이트.
- `index.html` 줄 수, 주요 함수 설명(`render()`, `refs`, `FACES[].fit`) 반영.

## 8. 빌드 · 설치

```
npx cap copy android
gradlew.bat assembleDebug   # BUILD SUCCESSFUL (39s)
adb -s SM-F946N install -r app-debug.apk
```

단말 **SM-F946N** (Galaxy Z Fold5) 커버 디스플레이에서 10개 face 순환 동작 확인 완료.

커밋: `ec61b64` "refactor(faces): 데이터 주도 Face 레지스트리로 정리 + 스펙 문서" (4 files, +480 / -141)

## 배운 점

- **innerHTML 재생성이 CSS 애니메이션 위상을 리셋한다** — 매초 `innerHTML` 을 교체하면 브라우저가 요소를 새로 생성·삽입하므로 `@keyframes` 타이머가 0에서 재시작된다. 깜빡임·페이드처럼 연속성이 중요한 애니메이션은 정적 마크업을 유지하고 `textNode`만 교체해야 한다.
- **data-bind 패턴 vs. 수동 getElementById** — ref 수가 30개 이상이 되면 id 오탈자·중복을 잡기가 어렵다. 마크업에 의도를 선언하고 JS가 수집하는 방식이 리팩터링 안전성을 높인다.
- **fit 설정 데이터화의 이점** — 분기문 하나를 없애는 것 이상으로, face 추가 시 `FACES[]`에 `fit` 필드만 채우면 `fitActive()` 수정 없이 동작한다. 확장 지점을 데이터로 밀어내는 것이 실질적 유지보수 비용 절감.
- **localStorage에 인덱스 대신 id 저장** — UI 순서나 face 삭제로 인덱스가 어긋나면 전혀 다른 face가 복원된다. 안정 식별자(id)를 키로 써야 순서 변경에 무관하게 복원이 정확하다.

## 내일 할 일

- [ ] 10개 face 중 face5~face10 실기기 시각 점검 (오늘은 순환 동작만 확인, 세부 레이아웃 미검증).
- [ ] `render()` 함수 단위 테스트 시나리오 검토 — `parts` 객체 목(mock)을 넣어 DOM 상태 검증 가능 여부.
- [ ] 콜론 깜빡임 연속성을 face2·face3 에서도 확인 (오늘은 face4 위주).
- [ ] 0623 미완료: Fold5 저볼륨 환경 소나 절대 사이드밴드 지표 재검증.
- [ ] 0623 미완료: 마이크 권한 영구 거부 시 UX 안내 문구 개선.

## 변경 파일

- `app/index.html` — tick() 리팩터링, data-bind 자동 수집, innerHTML 고정, localStorage id 전환.
- `CLAUDE.md` — FACES 표·줄 수·함수 설명 갱신.
- `docs/face-refactor-spec.html` — lavish-axi 스펙 산출물 (신규).
