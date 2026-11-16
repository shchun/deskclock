# CI debug signing

`debug.keystore` is an intentionally public, project-specific **debug/test** key.
Both its store password and `androiddebugkey` key password are `android`.
It is not a production signing credential. Keep this file unchanged so CI APKs
can update other CI APKs without a signature mismatch.

Only builds with `DESKCLOCK_CI_SIGNING=true` use it; local development keeps its
normal Android debug key. Switching from a locally signed APK to a CI APK may
require uninstalling the old APK once. Never use this key for store publishing.

## Windows 업데이트 서명

첫 업데이트 지원 릴리스의 버전 태그를 푸시하기 전에 `npm exec -- tauri signer generate -w <저장소 밖의 키 파일 경로>`로 서명 키를 생성합니다. 키 파일과 암호를 안전하게 백업하고 후속 릴리스에도 같은 키를 사용합니다.

GitHub 저장소의 **Settings → Secrets and variables → Actions**에 다음 값을 등록합니다.

| 유형 | 이름 | 값 |
| --- | --- | --- |
| Variable | `TAURI_UPDATER_PUBLIC_KEY` | 생성된 `.pub` 파일의 내용 |
| Secret | `TAURI_SIGNING_PRIVATE_KEY` | 생성된 개인키 파일의 내용 |
| Secret | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 키를 암호화했다면 생성할 때 입력한 암호 |

릴리스 워크플로는 NSIS 설치 파일을 서명하고 `.sig`와 `latest.json`을 GitHub Releases에 올립니다. 앱은 공개 저장소의 최신 릴리스에서 이 파일을 읽고, 설치 파일의 서명과 서명된 버전을 검증합니다. PR 빌드는 서명 키 없이 실행할 수 있습니다.

첫 릴리스의 `-setup.exe`를 설치한 뒤 다음 서명된 버전을 배포하면 트레이의 업데이트 설치부터 새 버전 재실행까지 확인할 수 있습니다.
