# Privacy Checklist — Reptilita 1.0.1 (Pre-Submission Audit)

Audit date: **2026-05-31**. Confirm against the **exact production archive** uploaded to App Store Connect. Legal review recommended before final privacy label submission.

---

## 1. Permissions (iOS)

| Permission | Key | Declared use | Audit |
|------------|-----|--------------|-------|
| **Camera** | `NSCameraUsageDescription` | User-initiated photos (profile, journal, optional Photo Health preview) | [ ] Wording matches actual triggers in `PetPhotoPicker` / health preview |
| **Photo Library** | `NSPhotoLibraryUsageDescription` | Choose existing photos for profile, journal, preview, share | [ ] No background photo access |
| **Location** | — | Not requested | [ ] Confirm no location keys added in plist |
| **Microphone** | — | Not requested | [ ] |
| **Bluetooth** | — | Not for IoT in production UI | [ ] |
| **Apple Watch** | Companion only | WatchConnectivity; no separate health kit claim | [ ] Watch privacy matches iPhone data flow |

**Info.plist reference:** `ios/App/App/Info.plist`

---

## 2. Data Collection Wording (App Store Connect)

Align **Privacy Nutrition Labels** and **App Privacy** questionnaire with `docs/app-store/privacy-answers-draft.md` and in-app `PrivacyPolicyPage.tsx`.

| Data type | Collected? | Linked to user? | Used for | Verify in build |
|-----------|------------|-----------------|----------|-----------------|
| User content (animals, schedules, journal) | Yes (user-entered) | When signed in / synced | App functionality | [ ] |
| Photos | Yes (user-selected) | When synced/shared | App functionality | [ ] |
| Email / user ID | If sign-in | Yes | Auth, sync, support | [ ] |
| Diagnostics | Limited server/client logs | Sometimes | Operations, security | [ ] |
| AI / Pro prompts & context | If Pro feature used | If signed in | User-requested responses | [ ] |

| Label answer | Expected |
|--------------|----------|
| **Tracking** | No (unless ad/tracking SDK added) |
| **Data sold** | No |
| **Third-party advertising** | No |

---

## 3. Sensitive Logging

| Check | Status | Notes |
|-------|--------|-------|
| Watch sync debug logs | [ ] Pass (prod) | `watchTodaySync.ts`: `console.info` only when `import.meta.env.DEV` |
| Watch Swift logs | [ ] Pass (Release) | `WatchCareSession` uses `Logger` behind `#if DEBUG` for debug strings |
| Supabase keys in logs | [ ] | No logging of `VITE_SUPABASE_PUBLISHABLE_KEY` |
| User photos / journal in logs | [ ] | No base64 or full record dumps in production |
| Sync telemetry | [ ] | `syncTelemetry.ts` documented as client-only hints, no secrets |

**Manual test:** Release build on device → Xcode console → perform Today + Watch sync → confirm no verbose `[WatchTodaySync]` spam.

---

## 4. No Debug UI in Production

| Item | Audit |
|------|-------|
| Sample datasets (`VITE_ENABLE_SAMPLE_DATASETS`) | [ ] Disabled in App Store archive (production = off unless env explicitly set at build) |
| Watch debug controls | [ ] Moved to Settings; confirm hidden or dev-gated in production |
| Capacitor debug | [ ] `CAPACITOR_DEBUG` from xcconfig — Release should not enable web debug |
| Reviewer demo seed UI | [ ] No visible “reviewer mode”; seed is email-gated only |

---

## 5. No Service Worker in Native Build

| Check | Status | Notes |
|-------|--------|-------|
| iOS release script | [ ] | `npm run release:ios` → `REPTILITA_DISABLE_PWA=1 vite build` |
| PWA stub | [ ] | `src/pwa-register-stub.ts` replaces virtual PWA register when PWA disabled |
| Vite config | [ ] | `vite-plugin-pwa` skipped when `REPTILITA_DISABLE_PWA=1` |
| Verify in archive | [ ] | Search `dist` / bundled assets for `sw.js`, `workbox`, `service-worker` — should be absent after `build:ios` |

**Command (after build):**

```bash
npm run build:ios
rg -i 'service-worker|workbox|sw\.js' dist || echo 'OK: no SW artifacts found'
```

---

## 6. No Hardcoded Secrets

| Secret type | Expected handling | Audit |
|-------------|-------------------|-------|
| Supabase anon/publishable key | `VITE_SUPABASE_PUBLISHABLE_KEY` at **build time** (CI/Xcode env), not committed | [ ] `.env` gitignored; `.env.example` has placeholder only |
| Supabase URL (prod) | Canonical `https://mkgdgxsrykwmopokvxlx.supabase.co` in `env.ts` | [ ] Public URL OK; not a secret |
| OpenAI / server AI keys | Edge function / server only; not in client binary | [ ] `secureKey.ts` is user-stored key name, not embedded secret |
| Demo reviewer password | App Store Connect only | [ ] Not in repo or metadata files |

**Repo scan (pre-submit):**

```bash
rg -i 'sk-[a-zA-Z0-9]{20,}|OPENAI_API_KEY\s*=\s*["\x27][^"\x27]+' --glob '!node_modules' .
```

---

## 7. In-App Privacy & Legal Surfaces

| Surface | Location | Audit |
|---------|----------|-------|
| Privacy Policy | `/privacy` in app | [ ] Reachable from Settings; effective date May 4, 2026 |
| Terms | `/terms` (if routed) | [ ] Linked from Settings |
| Support | `support@reptilita.com` | [ ] Settings mailto |
| Account deletion / data | Settings copy | [ ] Path documented for App Review expectations |
| Photo Health disclaimer | In feature UI | [ ] Informational / not diagnostic |

---

## 8. Watch & Cross-Device Data

| Flow | Data shared | Audit |
|------|-------------|-------|
| iPhone → Watch | Today snapshot JSON (counts, next task, animal name, dates) | [ ] No full journal export to Watch |
| Watch → iPhone | Quick action messages (feed/clean/mist, task ids) | [ ] Applied on phone; optional cloud push after task done |
| Cached on Watch | Last snapshot in `UserDefaults` | [ ] Acceptable; document in review notes |

---

## 9. Optional Cloud & AI (If Enabled in Build)

- [ ] Sign-in uses Supabase Auth (HTTPS)
- [ ] Pro AI sends user-selected context to server function — disclosed in privacy policy
- [ ] Public share only when user creates link
- [ ] No sale of personal data stated in policy and labels

---

## 10. Encryption Export

- [ ] `ITSAppUsesNonExemptEncryption` = **false** in Info.plist
- [ ] App Store Connect export compliance questions answered consistently

---

## Sign-Off

| Role | Name | Date | OK |
|------|------|------|-----|
| Engineering | | | [ ] |
| Privacy / Legal | | | [ ] |
| Release manager | | | [ ] |

**Block submission if:** production build logs PII, service worker present, secrets in binary, or privacy labels contradict actual SDK/network behavior.
