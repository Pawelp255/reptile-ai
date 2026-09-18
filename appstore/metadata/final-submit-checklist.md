# Final Submission Checklist — Reptilita 1.0.1

Target submission date: **2026-05-31**. Complete every section on the **same build** uploaded to App Store Connect.

Related files:

- Copy: `app-store-copy.md`
- Review notes: `review-notes.md`
- Screenshots: `screenshot-plan.md`
- Privacy: `privacy-checklist.md`
- Extended QA: `docs/app-store/testflight-qa-checklist.md`

---

## A. Pre-Build Gates

- [ ] Version **1.0.1** in `package.json` and Xcode **Marketing Version**
- [ ] **Build number** incremented on App and Watch targets (`CURRENT_PROJECT_VERSION`)
- [ ] Signing: Distribution certificate + App Store provisioning profile for `com.reptilita.app`
- [ ] Watch App target included in archive scheme
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` set for release build (CI or local env)
- [ ] `VITE_ENABLE_SAMPLE_DATASETS` **not** set for store build
- [ ] Privacy checklist (`privacy-checklist.md`) signed off

---

## B. Build Web Assets & Sync iOS

From repo root:

```bash
npm ci
npm run release:ios
```

This runs:

1. `REPTILITA_DISABLE_PWA=1 vite build` — native bundle without service worker
2. `npx cap sync ios` — copies web assets into Xcode project

**Verify after build:**

```bash
rg -i 'service-worker|workbox' dist || echo 'OK: no SW in dist'
```

- [ ] `dist/` generated without errors
- [ ] Capacitor sync completed
- [ ] No accidental dev env files bundled

---

## C. Xcode Archive

1. Open workspace/project:

   ```bash
   npx cap open ios
   ```

   Or open `ios/App/App.xcodeproj` in Xcode.

2. Select scheme **App** (with Watch companion embedded).
3. Destination: **Any iOS Device (arm64)** — not Simulator.
4. **Product → Archive** (Release configuration).
5. In Organizer → **Validate App** (fix signing/entitlements issues).
6. **Distribute App → App Store Connect → Upload**.

- [ ] Archive includes Watch app
- [ ] Validation passed
- [ ] Upload succeeded (note build number in Connect)

---

## D. App Store Connect — Version 1.0.1

### Metadata (paste from `app-store-copy.md`)

- [ ] App name: Reptilita
- [ ] Subtitle
- [ ] Promotional text (≤170 chars)
- [ ] Description
- [ ] Keywords (≤100 chars)
- [ ] What’s New
- [ ] Support URL live (`https://reptilita.com/` — confirm contact path)
- [ ] Privacy Policy URL live (`https://reptilita.com/privacy` — verify)
- [ ] Marketing URL (optional)
- [ ] Screenshots: iPhone 6.7" (+ 6.5" if required)
- [ ] Apple Watch screenshots (recommended for 1.0.1)
- [ ] Primary category: Lifestyle; Secondary: Productivity
- [ ] Age rating questionnaire completed
- [ ] Export compliance (no non-exempt encryption)

### App Review Information

- [ ] Notes pasted from `review-notes.md` (paste block)
- [ ] Demo sign-in: `demo.reptilita@gmail.com` + password in secure field
- [ ] Contact: support@reptilita.com

### Build linkage

- [ ] Select uploaded build **1.0.1 (61)**
- [ ] Watch-compatible build recognized

---

## E. TestFlight Smoke Test

Install TestFlight build on **physical iPhone + paired Apple Watch**.

### Core (15–20 min)

- [ ] Cold launch — no crash
- [ ] Create animal without sign-in
- [ ] Today shows due/overdue after schedules exist
- [ ] Mark task done; counts update
- [ ] Add journal event; appears in history
- [ ] Sign in (demo or test account) — sync if online
- [ ] Settings → Privacy Policy and Terms open
- [ ] Export PDF or backup once (native share sheet)

### Apple Watch (10 min)

- [ ] Open Reptilita on iPhone (Today) — wait for sync
- [ ] Watch app shows Today snapshot (overdue/due/done)
- [ ] Quick **Feed** or **Clean** updates iPhone Today
- [ ] **Mist** logs note when applicable
- [ ] Watch empty state shows iPhone prompt when phone app closed

### Regression spot-checks

- [ ] Offline: open app, view animals, mark task (local)
- [ ] No debug sample data section in production Settings
- [ ] Photo picker respects permissions
- [ ] No push notification permission prompt (none implemented)

Full matrix: `docs/app-store/testflight-qa-checklist.md`

---

## F. Submit for Review

1. App Store Connect → your app → **1.0.1** version.
2. Confirm all required fields green.
3. **Add for Review** / **Submit to App Review**.
4. Answer additional export/content questions if prompted.
5. Monitor Resolution Center for reviewer questions (Watch sync, demo account).

- [ ] Submitted for review
- [ ] Submission timestamp recorded
- [ ] Team notified (support inbox monitored)

---

## G. Post-Submit (Do Not Block Submit)

- [ ] Monitor TestFlight crash logs
- [ ] Prepare next hotfix branch if rejected for metadata only
- [ ] Respond to App Review within 24h if Watch testing questioned

---

## Quick Reference

| Item | Value |
|------|--------|
| Release command | `npm run release:ios` |
| Bundle ID | `com.reptilita.app` |
| Marketing version | 1.0.1 |
| Demo email | demo.reptilita@gmail.com |
| Support | support@reptilita.com |
| Docs pack | `appstore/metadata/*.md` |

---

## Submission Blockers (Hold If Any Fail)

- Demo credentials do not seed library
- Watch companion missing from archive or non-functional on device
- Service worker or debug logging in Release
- Privacy URL or support URL 404
- Screenshots claim diagnosis, push notifications, or full cloud restore not verified
- Hardcoded API secrets found in shipped binary
