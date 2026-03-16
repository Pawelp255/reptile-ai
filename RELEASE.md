# Reptile AI — Release & Build Guide

Concise notes for building and packaging the app for web, PWA, and native (iOS/Android).

---

## Build commands

| Target        | Command              | Output / Next step                    |
|---------------|----------------------|----------------------------------------|
| Web / PWA     | `npm run build`      | `dist/` — deploy to any static host    |
| Capacitor iOS | `npm run build` then `npx cap sync ios`  | Open Xcode, archive, submit |
| Capacitor Android | `npm run build` then `npx cap sync android` | Open Android Studio, build bundle |

---

## App icons

- **Location:** `public/icon-192.svg`, `public/icon-512.svg`, `public/apple-touch-icon.svg`
- **PWA manifest:** Icons are referenced in `vite.config.ts` (VitePWA plugin). 192 and 512 are used for install and splash.
- **iOS/Android:** After `cap sync`, add platform-specific icons:
  - **iOS:** Replace assets in `ios/App/App/Assets.xcassets/AppIcon.appiconset/` (use Xcode or provide 1024×1024 and let Xcode generate sizes).
  - **Android:** Replace `android/app/src/main/res/mipmap-*` drawables. Provide at least `mipmap-hdpi`, `mipmap-mdpi`, `mipmap-xhdpi`, `mipmap-xxhdpi`, `mipmap-xxxhdpi` (see Android adaptive icon docs).
- **Recommendation:** Export a 1024×1024 PNG from your brand icon and use a tool (e.g. app-icon.co) to generate all required sizes.

---

## Splash screen

- **Config:** `capacitor.config.ts` → `plugins.SplashScreen`. Background color is set to `#2a9d8f` (teal).
- **Assets:** Capacitor uses the first launch screen from the native project. To customize:
  - **iOS:** Replace splash in `ios/App/App/Assets.xcassets/Splash.imageset/` or use a storyboard.
  - **Android:** Replace `android/app/src/main/res/drawable/splash.png` (and density variants). Keep the same background color or update `backgroundColor` in config to match.
- **Theme:** App uses a light status bar and teal accent; splash background matches for a consistent transition.

---

## Status bar

- **Config:** `capacitor.config.ts` → `plugins.StatusBar`: style `LIGHT`, background `#2a9d8f`.
- **Runtime:** `src/hooks/useCapacitor.ts` sets status bar style and (on Android) background color when the app loads. No change needed for release unless you switch to a dark theme.

---

## Capacitor production build

- **Production:** Do **not** set `CAPACITOR_DEV_SERVE`. Run `npm run build` then `npx cap sync`. The app loads from `webDir` (`dist/`).
- **Optional dev with remote URL:** Set `CAPACITOR_DEV_SERVE=true` before `cap sync` / `cap run` if you need to point at a remote dev server (e.g. Lovable preview).
- **App identity:** In `capacitor.config.ts`, `appId` is `com.reptileai.app` and `appName` is `Reptile AI`. Change `appId` if you need a different bundle identifier (e.g. for an existing app).

---

## Remaining steps before store submission

1. **Icons:** Add production app icons for iOS and Android (see App icons above).
2. **Splash:** Optionally replace default splash assets with branded artwork (see Splash screen above).
3. **iOS:** In Xcode, set signing team, bundle ID, version and build number; enable required capabilities (e.g. Keychain if using secure storage).
4. **Android:** In Android Studio, set applicationId, versionCode/versionName, and signing config for release.
5. **PWA:** Ensure your host serves the built `dist/` with HTTPS and that the manifest and service worker are reachable (Vite PWA handles generation).

---

## Performance notes

- Heavier routes (AI, Genetics, Growth, Care Card, Health Check) are lazy-loaded; their chunks load on first visit to those routes.
- Initial bundle excludes Recharts, AI UI, and Care Card–specific dependencies until needed.
