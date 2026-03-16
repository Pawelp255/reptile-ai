# Reptile AI — iOS/Android Build Guide (Capacitor)

This guide covers building the Reptile AI app as a native iOS/Android application using Capacitor.

## Prerequisites

| Platform | Requirements |
|----------|-------------|
| **iOS** | macOS, Xcode 15+, CocoaPods, Apple Developer account (for device testing) |
| **Android** | Android Studio Hedgehog+, JDK 17+, Android SDK 33+ |
| **Both** | Node.js 18+, npm |

## Initial Setup

```bash
# 1. Clone and install dependencies
git clone <your-repo-url>
cd reptile-ai
npm install

# 2. Build the web assets
npm run build

# 3. Add native platforms
npx cap add ios
npx cap add android

# 4. Sync web assets to native projects
npx cap sync
```

## Development Workflow

After making code changes:

```bash
# Build and sync
npm run build
npx cap sync

# Open in IDE
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio

# Or run directly on device/emulator
npx cap run ios
npx cap run android
```

## Hot Reload During Development (Optional)

For faster iteration with live reload:

1. Find your local IP:
   - macOS: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - Windows: `ipconfig`

2. Edit `capacitor.config.ts`:
   ```ts
   server: {
     url: 'http://YOUR_LOCAL_IP:8080',
     cleartext: true,
   }
   ```

3. Start dev server and run:
   ```bash
   npm run dev
   npx cap run ios       # or android
   ```

4. **⚠️ Important**: Remove the `server.url` before building for production!

## iOS Build

### Simulator
```bash
npm run build
npx cap sync ios
npx cap open ios
```
In Xcode: Select simulator → ▶️ Run

### Physical Device
1. Connect iPhone via USB
2. Select your device in Xcode
3. Go to **Signing & Capabilities** → select your Team
4. Click ▶️ to build and run

### App Store
1. **Product → Archive** in Xcode
2. **Distribute App → App Store Connect**
3. Follow the upload wizard

### iOS Troubleshooting

| Issue | Solution |
|-------|----------|
| No signing certificate | Add Apple Developer account: Xcode → Preferences → Accounts |
| Pod install fails | `cd ios/App && pod install --repo-update` |
| Build fails | **Product → Clean Build Folder** |

## Android Build

### Emulator
```bash
npm run build
npx cap sync android
npx cap open android
```
In Android Studio: Wait for Gradle sync → Select emulator → ▶️ Run

### Physical Device
1. Enable **Developer Options** (tap Build Number 7 times)
2. Enable **USB Debugging**
3. Connect via USB → select in Android Studio → ▶️

### Build APK/AAB
```bash
cd android

# Debug APK
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk

# Release AAB (Play Store)
./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

### Android Troubleshooting

| Issue | Solution |
|-------|----------|
| Gradle sync failed | **File → Sync Project with Gradle Files** |
| SDK not found | **Tools → SDK Manager** → install required SDKs |
| JAVA_HOME error | Install JDK 17, set JAVA_HOME environment variable |
| Device not detected | Verify USB debugging enabled, try different cable |

## App Icons & Splash Screen

### Generating Icons

Create a 1024×1024 PNG icon, then:

```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#2a9d8f'
```

### Recommended Icon Sizes

| Platform | Size | Location |
|----------|------|----------|
| iOS | 1024×1024 | `ios/App/App/Assets.xcassets/AppIcon.appiconset/` |
| Android | 512×512 (adaptive) | `android/app/src/main/res/mipmap-*/` |

### Splash Screen

Configured in `capacitor.config.ts`. Create 2732×2732 splash images and place in platform resource folders, then `npx cap sync`.

## API Key Security on Native

- On native platforms, the OpenAI API key is stored in **Capacitor Preferences** (encrypted on-device storage).
- On iOS, this uses the Keychain under the hood. On Android, it uses SharedPreferences.
- For maximum security, consider integrating `@nicegoodthings/capacitor-secure-storage` for hardware-backed key storage.

## Public QR Codes

Care Card QR codes point to an in-app route (`/care-card/:reptileId`). For QR codes to work on **other devices**:

1. Host the web app on a public URL (Cloudflare Pages, Netlify, Vercel, etc.)
2. Set the **Public Share URL** in Settings → Sharing
3. QR codes will then use your hosted URL instead of `localhost`

Without web hosting, QR codes only work within the same app instance.

## Expo Demo Tips

When demonstrating at a reptile expo:

1. **Enable Expo Demo Mode** in Settings to load sample data (3 reptiles, events, pairings)
2. Show the **Care Card** feature with QR codes — attendees can scan to see the card
3. Demo the **AI Assistant** with pre-selected context for instant analysis
4. Use the **Promo Card** export in Settings → Expo Mode → Share Promo Card
5. **Reset Demo Data** after each demo session to start fresh

## SPA Routing on Native

Capacitor handles SPA routing automatically — all routes (including `/care-card/:id` and `/ai`) work without additional configuration. The `webDir: 'dist'` setting serves the bundled app which includes the router.

## Common Commands Reference

```bash
npm run dev           # Start dev server (web)
npm run build         # Build production web assets
npx cap sync          # Sync web → native
npx cap open ios      # Open Xcode
npx cap open android  # Open Android Studio
npx cap run ios       # Build & run on iOS
npx cap run android   # Build & run on Android
npx cap update        # Update native plugins
```
