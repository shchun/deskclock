# CI debug signing

`debug.keystore` is an intentionally public, project-specific **debug/test** key.
Both its store password and `androiddebugkey` key password are `android`.
It is not a production signing credential. Keep this file unchanged so CI APKs
can update other CI APKs without a signature mismatch.

Only builds with `DESKCLOCK_CI_SIGNING=true` use it; local development keeps its
normal Android debug key. Switching from a locally signed APK to a CI APK may
require uninstalling the old APK once. Never use this key for store publishing.
