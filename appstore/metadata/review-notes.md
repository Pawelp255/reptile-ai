# App Review Notes — Reptilita 1.0.1

Copy the **App Review Notes (paste block)** section into App Store Connect → App Review Information → Notes. Put demo credentials in the secure **Sign-in required** fields, not in public listing text.

---

## App Review Notes (paste block)

```
REPTILITA 1.0.1 — REPTILE & AMPHIBIAN CARE ORGANIZER (NOT MEDICAL)

Reptilita is a local-first husbandry tracker: animal profiles, Today care tasks, schedules, journal/history, exports, and optional cloud sync. It does not diagnose, treat, prescribe, or provide emergency veterinary care. Photo Health and any AI content are informational only.

NO LOGIN REQUIRED FOR CORE USE
• Launch the app and use local care tracking without signing in.
• My Animals (+) → create an animal; Today and Journal work offline on device storage.
• Sign-in is optional for cloud sync of supported records (animals + care schedules).

OPTIONAL DEMO ACCOUNT (RECOMMENDED FOR FAST REVIEW)
• Email: demo.reptilita@gmail.com
• Password: [provided in Sign-in required field above]
• On first sign-in with an empty library, the app automatically seeds three sample animals (two Ball Pythons, one White’s Tree Frog), schedules, journal entries, and a breeding pairing example. No hidden gestures or reviewer-only screens—standard UI only.

HOW TO CREATE AN ANIMAL
1. Open the app (no sign-in needed).
2. Go to My Animals (Reptiles tab).
3. Tap + / Add animal.
4. Enter name, species/group, optional photo, and save.
5. Default feeding/cleaning/check schedules are created for the animal.

HOW TO CREATE TASKS / SCHEDULES / EVENTS
• Schedules: Open an animal profile → Schedules (or edit schedule from profile) → set feeding, cleaning, or routine check frequency.
• Today tasks: Appear on Today when due or overdue based on those schedules.
• Journal events: Journal tab → add entry (feeding, shed, weight, cleaning, note, etc.) or add from an animal’s history.

HOW TO TEST APPLE WATCH COMPANION
• Reptilita ships an embedded Watch app (companion to the iOS app, not standalone).
• On iPhone: Create at least one animal with a due or overdue feed/clean/check task (demo account seeds this automatically).
• Open Reptilita on iPhone and leave it in the foreground briefly so Today sync runs.
• On Apple Watch: Open Reptilita → Today shows overdue / due / done counts, next task, and Quick Actions: Feed, Clean, Mist.
• iPhone is the source of truth: Watch displays a snapshot from iPhone via WatchConnectivity; actions from Watch are applied on iPhone.
• If Watch shows “Open Reptilita on iPhone”, unlock iPhone, open the app on Today, wait a few seconds, then reopen Watch app.

WATCH QUICK ACTIONS
• Feed / Clean: Completes the next matching due/overdue schedule task on iPhone.
• Mist: Logs a misting note on iPhone when no matching mist schedule exists.

PHOTO PERMISSIONS
• Camera and photo library are used only when the user picks or captures a photo (profile, journal, optional Photo Health preview).

NO NATIVE PUSH NOTIFICATIONS
• Reminders are in-app schedules and optional calendar export—not APNs push in this build.

SUPPORT
• support@reptilita.com
• In-app: Settings → Email support; Privacy Policy and Terms linked from Settings.
```

---

## Sign-In & Access

| Topic | Detail |
|--------|--------|
| **Login required?** | **No** for animal profiles, Today, schedules, journal, local backup/export |
| **Optional sign-in** | Supabase auth (email/password, Google, Apple OAuth if configured in build) |
| **Demo account** | `demo.reptilita@gmail.com` — password only in Connect secure field |
| **Demo seeding** | Automatic on first sign-in when library empty; keyed to reviewer email (`src/lib/review/appleReviewDemoSeed.ts`) |
| **Without demo** | Reviewer can tap through: add animal → schedules appear → Today shows tasks |

---

## Apple Watch Companion

| Item | Explanation |
|------|-------------|
| **Type** | Embedded Watch companion app bundled with iOS app |
| **Sync** | `WatchConnectivity` — iPhone pushes `WatchTodaySnapshot` (counts, next task, animal name) |
| **Source of truth** | iPhone app (Capacitor/Web layer + native bridge `ReptilitaWatchBridge`) |
| **Watch UI** | `WatchCareTodayView` — Today title, progress ring, Overdue/Due/Done stats, Next task, Feed/Clean/Mist |
| **Empty state** | “Open Reptilita on iPhone to refresh today’s care” when no snapshot yet |
| **Review hardware** | Pair Apple Watch with test iPhone; both apps installed from same archive |

**Reviewer path (minimal)**

1. Sign in as demo account **or** manually add one snake with feeding due today.
2. iPhone: **Today** tab — confirm at least one due/overdue task.
3. iPhone: keep app open ~5–10 seconds (snapshot push on foreground).
4. Watch: open **Reptilita** → confirm numbers match Today.
5. Watch: tap **Feed** → return to iPhone Today → task marked done / counts update after refresh.

---

## Step-by-Step: Core Flows

### Create an animal (no account)

1. **My Animals** → **Add** (+).
2. Fill name, animal group, species preset (optional), photo (optional).
3. **Save** — auto-generated feed/clean/check schedules are created.

### Create / see Today tasks

1. Schedules on animal profiles drive **Today**.
2. **Today** tab: progress summary, due and overdue cards, mark done.
3. Overdue repeating tasks: catch-up drawer (reset / roll forward / mark done) — test one overdue item if reviewing schedule behavior.

### Journal / care history

1. **Journal** tab → **Add event** (type, animal, date, notes).
2. Or animal profile → history section.
3. Events persist locally; cloud sync applies when signed in (supported record types).

### Cloud sync (optional)

1. **Settings** → **Sign In**.
2. After sign-in: **Sync** (when online) for supported animals and care schedules.
3. Journal/photos: confirm TestFlight behavior matches privacy copy before claiming full restore.

---

## Safety & Compliance (for reviewers)

- **Not veterinary software** — no diagnosis, treatment, emergency triage, or medication instructions.
- **Photo Health** — educational preview only; screenshots must not imply diagnosis.
- **No push notification claim** — in-app schedules only unless APNs is added in a future version.
- **Public share** — user-initiated; not a social network.
- **Encryption** — standard HTTPS; `ITSAppUsesNonExemptEncryption` = false.

---

## Credentials Checklist (App Store Connect)

- [ ] Demo email: `demo.reptilita@gmail.com`
- [ ] Demo password entered in **Sign-in required** (not in public description)
- [ ] Confirm demo account exists in Supabase Auth and seeds on clean install
- [ ] Contact phone optional; support email `support@reptilita.com` in Notes

---

## If Review Requests Clarification

- **Watch not updating:** Ask reviewer to open iPhone app on Today while Watch app is installed; snapshot refreshes on foreground and on Watch request.
- **Empty Watch:** No animals or no due tasks — add animal or use demo account.
- **AI / Pro:** Optional; not required for review of core care or Watch flows.
