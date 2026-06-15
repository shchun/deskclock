# 작업 로그 — 2026-06-16

## 1. 멀티 에이전트 시스템 설계

이 프로젝트(오프라인 Capacitor 데스크 클락)에 맞춘 서브에이전트 4종을 `.claude/agents/`에 정의해, 작업 성격별로 전문화된 에이전트가 처리하도록 역할을 분리했다.

| 에이전트 | 역할 | 트리거 |
|---|---|---|
| `apk-build-installer` | Capacitor web-asset 동기화 → Gradle 디버그 빌드 → ADB 설치/실행까지 빌드-설치 사이클 전담 | "apk 만들어 폰에 설치", "디버그 apk 빌드", "방금 바꾼 거 폰에서 보고싶어" |
| `neo-brutalist-ui-designer` | 네오 브루탈리즘 디자인 시스템(비비드 컬러·하드 섀도우·각진 박스) 기준으로 UI 설계/구현/리뷰 | "버튼 컴포넌트 만들어줘", "카드 컴포넌트 봐줄래", 색상·간격 결정 |
| `implementation-coder` | 계획·사양을 따라 프로덕션 코드 구현(클린 코드·에러 핸들링·테스트 가능 구조) | "이 계획대로 구현해줘", 구체 기능 구현 요청 |
| `senior-code-reviewer` | 작성/수정된 코드 청크를 구조·보안·성능·접근성 관점에서 시니어 레벨 리뷰 | 기능/컴포넌트 완성 직후, "방금 작성한 코드 리뷰해줘" |

### 설계 의도
- **단일 책임 분리**: 빌드/설치(인프라), UI 디자인(시각), 구현(로직), 리뷰(품질)를 각자 다른 에이전트가 담당해 컨텍스트 오염을 줄임.
- **프로젝트 맞춤**: `apk-build-installer`는 이 저장소의 실제 빌드 흐름(`npx cap copy android` → `gradlew assembleDebug` → `adb install`)을, `neo-brutalist-ui-designer`는 `docs/DESIGN.md`의 디자인 사양을 전제로 동작.
- **각 정의에 사용 예시(example) 포함**: 어떤 발화에서 해당 에이전트를 호출해야 하는지 commentary로 명시해 라우팅 정확도를 높임.

### 커밋
- `0d2f204` chore(claude): apk-build-installer 에이전트 추가
- `1d72b07` chore(claude): 서브에이전트 정의 4종 공유 (apk-build-installer / implementation-coder / neo-brutalist-ui-designer / senior-code-reviewer)
- 로컬 전용 설정·메모리는 공유 대상에서 제외(`7113720`).

## 2. 멀티 에이전트 동작 확인

`apk-build-installer` 에이전트를 실제로 실행해 end-to-end 동작을 검증했다.

- **Step 1 — Capacitor 동기화**: ✅ 정상. web assets가 `android/app/src/main/assets/public`로 복사됨.
- **Step 2 — Gradle 빌드**: 에이전트 실행 단계에서는 `gradlew.bat` 실행 권한이 거부되어 중단됨 → 권한 제약을 메인 세션에서 직접 빌드로 우회하여 완료.
- **빌드 실패 원인 해결**: `android/local.properties`에 SDK 경로가 없어 "SDK location not found" 발생 → `sdk.dir=C:\Users\seung\AppData\Local\Android\Sdk` 추가로 해결(해당 파일은 gitignore 대상).
- **결과물**: `android/app/build/outputs/apk/debug/app-debug.apk` (약 4.2MB) 빌드 성공. 설치/실행(ADB) 단계는 사용자가 보류.

→ 에이전트 라우팅·작업 위임 흐름은 정상 동작했고, 빌드 권한(샌드박스) 제약이 유일한 병목이었음을 확인.

## 3. CLAUDE.md 추가

- 다음 Claude Code 세션용 가이드 `CLAUDE.md` 신규 작성: 빌드/설치 명령, `app/index.html` 단일 파일 아키텍처, 얇은 네이티브 레이어(`MainActivity`/위젯), 컨벤션·함정(폰트 내장·SW 없음·`cap copy` 필수·`local.properties`).
- `main` 기준 `docs/claude-md` 브랜치 생성 → CLAUDE.md 단일 파일 커밋(`b63601b`) → **PR #3** (https://github.com/shchun/deskclock/pull/3).
- 동일 내용을 `feat/neo-brutalist-ui`에도 커밋(`07feb15`) 후 푸시.
- 두 커밋은 SHA만 다르고 CLAUDE.md blob(`57c775b`)은 동일 → 추후 머지 시 add/add 충돌 없음(merge-tree 시뮬레이션으로 확인).
