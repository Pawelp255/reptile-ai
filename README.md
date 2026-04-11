# Reptilita

A premium mobile-first reptile and amphibian care companion for keepers, breeders, rescue teams, and enthusiasts. Includes husbandry tracking, breeding tools, genetics support, and offline-first local data.

## Features

- 🦎 **Animal Management** - Track reptiles and amphibians with profiles, photos, and health records
- 📅 **Task Scheduling** - Feeding, cleaning, and health check reminders
- 🧬 **Advanced Genetics Calculator** - Dominant/codominant/recessive inheritance with pos-het support
- 🥚 **Breeding Management** - Pairings, clutches, and offspring tracking
- 📱 **Cross-Platform** - PWA + Native iOS/Android via Capacitor
- 💾 **Offline-First** - All data stored locally in IndexedDB

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Data**: IndexedDB (via idb library)
- **PWA**: vite-plugin-pwa with Workbox
- **Native**: Capacitor for iOS/Android

---

## Quick Start (Web Development)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs at `http://localhost:8080`

---

## Building for Production

```bash
# Build web assets
npm run build

# Preview production build
npm run preview
```

---

## Native Mobile Development (Capacitor)

### Prerequisites

| Platform | Requirements |
|----------|-------------|
| **iOS** | macOS, Xcode 15+, CocoaPods, Apple Developer account (for device testing) |
| **Android** | Android Studio Hedgehog+, JDK 17+, Android SDK 33+ |
| **Both** | Node.js 18+, npm or bun |

### Initial Setup (One-Time)

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

### Development Workflow

After making code changes:

```bash
# Build and sync to native projects
npm run build
npx cap sync

# Open in IDE
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio
```

### Hot Reload During Development (Optional)

For faster iteration, enable live reload:

1. Find your local IP: `ifconfig` (Mac) or `ipconfig` (Windows)

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
   npx cap run ios      # or android
   ```

4. **Important**: Remove the server URL before building for production!

---

## iOS Build Instructions

### Running on Simulator

```bash
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Select a simulator from the device dropdown
2. Click the ▶️ Play button

### Running on Physical Device

1. Connect your iPhone via USB
2. In Xcode, select your device from the dropdown
3. Go to **Signing & Capabilities** tab
4. Select your Team (requires Apple Developer account)
5. Click ▶️ to build and run

### Building for App Store

1. In Xcode: **Product → Archive**
2. In Organizer: **Distribute App → App Store Connect**
3. Follow the upload wizard

### iOS Troubleshooting

| Issue | Solution |
|-------|----------|
| "No signing certificate" | Add Apple Developer account in Xcode → Preferences → Accounts |
| Pod install fails | Run `cd ios/App && pod install --repo-update` |
| Build fails after Xcode update | Clean build: **Product → Clean Build Folder** |
| Simulator not showing | Check **Window → Devices and Simulators** |

---

## Android Build Instructions

### Running on Emulator

```bash
npm run build
npx cap sync android
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync to complete
2. Select an emulator from the device dropdown (or create one via AVD Manager)
3. Click the ▶️ Run button

### Running on Physical Device

1. Enable **Developer Options** on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging** in Developer Options
3. Connect device via USB
4. Select your device in Android Studio and click ▶️

### Building APK/AAB

```bash
# Debug APK (for testing)
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Release AAB (for Play Store)
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Android Troubleshooting

| Issue | Solution |
|-------|----------|
| Gradle sync failed | Click "Sync Now" or **File → Sync Project with Gradle Files** |
| SDK not found | Install via **Tools → SDK Manager** |
| JAVA_HOME error | Install JDK 17, set JAVA_HOME environment variable |
| Device not detected | Check USB debugging is enabled, try different USB cable |
| "Installed Build Tools revision X is corrupted" | Delete corrupted version in SDK Manager, reinstall |

---

## App Icons & Splash Screen

### Icon Requirements

| Platform | Size | Location |
|----------|------|----------|
| iOS | Multiple sizes | `ios/App/App/Assets.xcassets/AppIcon.appiconset/` |
| Android | Multiple sizes | `android/app/src/main/res/mipmap-*/` |

### Generating Icons

1. Create a 1024x1024 PNG icon
2. Use a tool like [capacitor-assets](https://github.com/ionic-team/capacitor-assets):
   ```bash
   npm install -g @capacitor/assets
   npx capacitor-assets generate --iconBackgroundColor '#2a9d8f'
   ```

### Splash Screen

The splash screen is configured in `capacitor.config.ts`. To customize:

1. Create splash images (2732x2732 recommended)
2. Place in platform-specific resource folders
3. Run `npx cap sync`

---

## Project Structure

```
├── src/                    # React application source
│   ├── components/         # UI components
│   ├── hooks/              # Custom hooks (including useCapacitor)
│   ├── lib/                # Utilities and storage
│   ├── pages/              # Page components
│   └── types/              # TypeScript definitions
├── public/                 # Static assets
├── dist/                   # Production build output
├── ios/                    # iOS native project (generated)
├── android/                # Android native project (generated)
├── capacitor.config.ts     # Capacitor configuration
└── vite.config.ts          # Vite build configuration
```

---

## Common Commands

```bash
# Development
npm run dev           # Start dev server
npm run build         # Build for production
npm run preview       # Preview production build

# Capacitor
npx cap sync          # Sync web assets to native
npx cap open ios      # Open iOS project in Xcode
npx cap open android  # Open Android project in Android Studio
npx cap run ios       # Build and run on iOS device/simulator
npx cap run android   # Build and run on Android device/emulator

# Update Capacitor
npx cap update        # Update native plugins
```

---

## Offline Data

All data is stored locally in IndexedDB:
- Reptile profiles and events
- Pairings, clutches, and offspring
- Scheduled tasks and reminders
- App settings

Data persists between sessions and survives app restarts. No cloud sync - your data stays on your device.

---

## Packaging for review / distribution

When creating a zip or package for code review, exclude:
- `node_modules/`
- `dist/`
- `.env` and `.env.*` (secrets)
- Build artifacts and IDE folders (see `.gitignore`)

---

## License

MIT License - feel free to use and modify for your own projects.
