# Desk Clock

여러 디자인으로 시간을 표시하는 오프라인 시계 앱입니다. **Windows에서는 데스크톱 위젯**, **Android에서는 전체화면 탁상시계**로 사용합니다. 글꼴과 화면 리소스를 앱에 포함해 네트워크 연결 없이 동작합니다.

## 시계 페이스

| 페이스 | 특징 | 지원 |
| --- | --- | --- |
| Mint LCD | 민트색 패널과 7세그먼트 숫자 | Windows |
| Brutal Type | 핑크 포인트와 굵은 타이포그래피 | Windows · Android |
| Minimal | 따뜻한 페이퍼 톤과 얇은 숫자 | Windows · Android |
| Retro Flip | 중앙에 배치한 시·분 플립 카드, 하단 날짜·AM/PM, 초 표시 없음 | Windows · Android |
| Typography | 큰 숫자와 세로 날짜, 버밀리언 포인트 | Windows · Android |
| Neon | 시안·마젠타 빛 번짐 효과 | Windows · Android |
| Terminal | 초록색 숫자와 터미널 화면 스타일 | Windows · Android |
| Liquid Goo | 중앙의 액체 형태 시·분 블롭, 하단 초·날짜 | Windows · Android |

Windows에서는 **민트 LCD를 포함한 8종**을 사용할 수 있습니다. 폴드 Android 기기에서는 경첩 센서가 감지되면 **Fold Neon · Fold Solid · Fold Analog** 3D 페이스가 추가로 표시됩니다.

## Windows 위젯 사용

- **페이스 전환:** 시계에 포커스를 둔 상태에서 좌우 방향키를 누르거나, 우클릭 메뉴의 **시계 페이스**에서 선택합니다.
- **메뉴 열기:** 시계 화면을 우클릭하면 트레이 아이콘과 동일한 메뉴가 열립니다. 화면 위에 별도 조작 버튼은 표시하지 않습니다.
- **위치 이동:** 시계를 왼쪽 마우스 버튼으로 드래그합니다. 위치와 설정은 자동 저장됩니다.
- **설정:** 우클릭 또는 트레이 메뉴의 **설정 열기**에서 항상 위 표시, Windows 시작 시 자동 실행, 크기, 글자색, 배경색, 불투명도를 조절합니다.
- **트레이 관리:** 작업 표시줄에는 창을 표시하지 않습니다. 트레이 메뉴에서 표시·숨기기와 종료를 관리하며, 아이콘을 더블클릭하면 시계를 다시 표시합니다.

시계가 보이지 않으면 작업 표시줄 오른쪽 **숨겨진 아이콘(∧)**에서 시계 아이콘을 찾아 더블클릭하세요.

모든 Windows 페이스는 동일한 둥근 모서리와 테두리 두께를 사용하며, 모서리 바깥은 투명합니다. 테두리 색은 각 디자인의 강조색에 맞췄습니다. 배경만의 불투명도 조절은 민트 LCD에 적용되며, 전체 불투명도는 모든 페이스에 적용됩니다.

### 크기와 화면 비율

기본 크기는 **360×141px**입니다. [Galaxy Z Fold5 외부 화면의 공식 해상도](https://news.samsung.com/global/samsung-galaxy-z-flip5-and-galaxy-z-fold5-delivering-flexibility-and-versatility-without-compromise)인 2316×904를 가로로 놓은 **약 2.562:1** 비율을 사용합니다.

| 크기 메뉴 | 너비 × 높이 |
| --- | --- |
| 작게 | 240×94px |
| 보통 | 360×141px |
| 크게 | 480×187px |

설정의 크기 슬라이더 또는 너비·높이 입력으로 더 세밀하게 조절할 수 있습니다. 기본 비율에서는 최소 **180×70px**, **Fold5 외부 화면 비율 유지**를 해제하면 **180×60px**까지 줄일 수 있습니다. 모니터 연결이 해제되거나 저장된 위치가 화면 밖에 있으면 사용 가능한 화면 안으로 보정합니다.

## Android 사용

시계 화면을 터치하면 다음 페이스로 전환되고, 마지막 선택은 재실행 후에도 유지됩니다. 앱은 전체화면과 가로 방향으로 표시하며 화면 꺼짐을 방지합니다. 폴드 전용 3D 페이스는 기기의 경첩 각도에 맞춰 표시됩니다.

## 개발 환경

- **Node.js 24**와 npm
- Windows 위젯 실행·EXE 빌드: **Windows**
- Android APK 빌드: **JDK 21**, **Android SDK 36**

### 의존성 설치

```bash
npm ci
```

### Windows 실행 및 빌드

```powershell
npm start
npm run build:windows
```

`release/`에 Windows x64 포터블 EXE가 생성됩니다. 자동 실행을 설정한 뒤에는 EXE 위치를 유지하세요. 개발 실행에서 자동 실행을 켜면 현재 Electron 실행 파일과 프로젝트 경로를 사용합니다.

### Android APK 빌드

처음 체크아웃했거나 네이티브 프로젝트 구성이 바뀌었으면 Capacitor를 동기화합니다.

```powershell
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Linux·macOS 빌드 환경에서는 `android/` 디렉터리에서 `bash ./gradlew assembleDebug`를 실행합니다.

산출물은 `android/app/build/outputs/apk/debug/app-debug.apk`입니다. 이후 웹 화면만 수정했다면 저장소 루트에서 `npx cap copy android`로 자산을 복사한 뒤 APK를 다시 빌드하세요.

USB로 연결한 Android 기기에 설치하려면 다음을 실행합니다.

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

디버그 APK는 개인 설치·테스트용입니다. 스토어 배포에는 별도의 릴리스 서명이 필요합니다. Windows 포터블 EXE에도 코드 서명은 적용하지 않습니다.

## APK·EXE 자동 빌드 및 릴리즈

`.github/workflows/release.yml`은 PR에서 Android APK와 Windows x64 포터블 EXE를 빌드해 검증합니다. 이때는 릴리즈를 발행하지 않으며 빌드 결과를 Actions의 Artifacts에서 30일간 받을 수 있습니다.

다음 중 한 방법으로 버전을 배포할 수 있습니다.

1. `v1.1.0`처럼 `v주.부.패치` 형식의 태그를 만들고 원격에 푸시합니다.
2. GitHub **Releases → Draft a new release**에서 해당 태그로 릴리즈를 발행합니다.
3. 이미 존재하는 태그를 재빌드하려면 **Actions → Build APK and EXE → Run workflow**에서 태그를 입력합니다.

```bash
git tag v1.1.0
git push origin v1.1.0
```

태그를 올리면 릴리즈도 자동 생성됩니다. 모든 빌드가 성공하면 다음 파일이 릴리즈에 첨부되어 버전별로 보관됩니다. 이미 발행한 릴리즈는 설명을 유지하면서 같은 이름의 첨부 파일만 갱신합니다.

- `DeskClock-1.1.0-android-debug.apk`
- `DeskClock-1.1.0-windows-x64.exe`
- `SHA256SUMS.txt`

두 빌드는 같은 Git 커밋을 사용하며, EXE와 APK의 버전은 태그에 맞춥니다. Android `versionCode`는 `주×1,000,000 + 부×1,000 + 패치`로 계산합니다(부·패치는 0–999, 전체 코드는 Android 허용 범위). 정식 버전 태그만 지원하며 베타·RC 태그는 빌드 전에 거부합니다.

추가 Secret 없이 사용할 수 있습니다. APK는 프로젝트에 포함된 공개 CI 디버그 키로 서명하며, CI 릴리즈 간 업데이트 설치 시 같은 서명을 유지합니다. 로컬 개발 APK와 서명이 다르면 처음 전환할 때 기존 APK를 제거해야 할 수 있습니다. 이 키는 스토어 배포용이 아니며, Windows EXE에도 코드 서명은 적용하지 않습니다. 자세한 키 용도는 [.github/ci/README.md](.github/ci/README.md)에 있습니다.


## 검증

```bash
npm run check:desktop
npm test
```

## 프로젝트 구조

```text
app/
  index.html       공통 시계 페이스, 시간 갱신·선택 저장, 폴드 3D 화면
  fonts/           내장 글꼴
  vendor/          폴드 3D용 라이브러리와 글꼴 데이터
  icons/           웹 앱 아이콘
  manifest.json    웹 매니페스트

desktop/
  main.js          Windows 창·트레이·메뉴·설정 저장
  preload.js       방향키·드래그와 데스크톱 화면 연결
  faces.js         Windows 페이스 목록과 테두리 색상
  widget.html      민트 LCD 화면
  widget.js        민트 LCD 숫자 갱신
  widget-frame.css 공통 둥근 프레임과 테두리
  settings.html    위젯 설정 화면
  settings.js      설정 조작과 저장

scripts/           릴리즈 버전 처리와 검증
.github/workflows/ APK·EXE 자동 빌드 및 릴리즈 워크플로
android/           Capacitor 네이티브 Android 프로젝트
screenshots/       초기 Android 디자인 캡처
docs/              디자인 참고 자료와 개발 기록
```

Windows의 위치·페이스·색상 등 설정은 사용자별 앱 데이터 폴더의 `widget.json`에 저장합니다. Android의 페이스 선택은 `localStorage`에 저장합니다.
