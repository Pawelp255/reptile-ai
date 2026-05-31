# App Store Copy — Reptilita 2.1.0

Paste-ready fields for App Store Connect. Version **2.1.0** (marketing version); confirm build number in Xcode before upload (project currently uses build **52–53** depending on target).

---

## App Name

**Reptilita**

(30-character limit; current name is within limit.)

---

## Subtitle

**Reptile care, schedules, records**

(30-character limit.)

Alternate if you want Watch emphasis (29 chars):

**Reptile care & Apple Watch**

---

## Promotional Text

*Max 170 characters. Can be updated without a new binary.*

**Recommended (169 characters):**

```
See today’s reptile care at a glance—tasks, journal history, and Apple Watch quick Feed/Clean/Mist. Local-first on iPhone; your phone syncs the Watch companion.
```

**Alternate — Watch-forward (168 characters):**

```
Glance at due care from Apple Watch. Quick Feed, Clean, and Mist actions sync from iPhone. Track reptiles & amphibians with Today tasks and a clear care journal—offline-friendly.
```

---

## Description

```
Reptilita helps reptile and amphibian keepers stay on top of daily husbandry without spreadsheet chaos.

Build a care library for snakes, lizards, turtles, frogs, and other herps. Add animal profiles, photos, species details, morph notes, feeding preferences, and schedules. The Today dashboard shows what is due, overdue, or complete so routines stay visible.

WHAT YOU CAN DO

• Reptile & amphibian care tracking — profiles, photos, and husbandry notes in one place
• Today tasks — due, overdue, and completed care in a single daily view
• Care history & journal — log feedings, sheds, weights, cleanings, and observations over time
• Flexible schedules — strict recurring routines and softer reminders
• Apple Watch companion — Today snapshot with overdue, due, and done counts
• Quick actions on Watch — Feed, Clean, and Mist from your wrist (iPhone applies changes)
• Local-first workflow — core records save on your device; use offline for day-to-day care
• Optional sign-in & cloud sync — restore supported animals and care schedules across sessions
• Export & backup — PDF care records, calendar export, and JSON backup/import
• Light, dark, and system appearance

APPLE WATCH

Reptilita includes an embedded Apple Watch companion app. Open Reptilita on iPhone to refresh Today’s care summary on Watch. iPhone remains the source of truth: schedules, journal entries, and library data live on the phone; Watch displays a synced snapshot and sends quick actions back to the phone.

OPTIONAL ACCOUNT & SYNC

Sign in to sync supported animal and schedule records through our backend. You can create animals, schedules, and journal entries without an account—data stays on the device until you choose to sign in and sync.

INFORMATIONAL ONLY

Reptilita is for husbandry organization, record keeping, and educational care support. It does not diagnose, treat, prescribe, or provide emergency veterinary triage. Photo Health preview and any AI-assisted content are informational only. Consult a licensed reptile-experienced veterinarian for medical concerns.
```

---

## Keywords

App Store Connect keyword field: **100 characters max**, comma-separated, no spaces after commas, no duplicate words from app name.

**Recommended field:**

```
reptile,snake,lizard,gecko,amphibian,frog,terrarium,feeding,husbandry,pet journal,watch
```

**Backup set (if “watch” is rejected or you prefer species focus):**

```
reptile,snake,lizard,gecko,amphibian,frog,terrarium,feeding,husbandry,pet journal,herp
```

---

## What’s New — Version 2.1.0

```
• Apple Watch companion — Today snapshot with overdue, due, and completed counts
• Quick Feed, Clean, and Mist actions from your wrist
• iPhone stays the source of truth — open the app on iPhone to refresh Watch sync
• Clearer Today care workflow and stability improvements for schedules and journal
• Optional cloud sync and backup polish for supported records
```

---

## URLs

| Field | Value | Notes |
|-------|--------|--------|
| **Support URL** | `https://reptilita.com/` | Must load without login. Page should include **support@reptilita.com** (in-app: Settings → Email support). **Verify live before submit.** |
| **Marketing URL** | `https://reptilita.com/` | Optional. Same site as brand presence (`og:url` in project). |
| **Privacy Policy URL** | `https://reptilita.com/privacy` | **Verify publicly accessible** before submit. In-app route: Settings → Privacy Policy (`/privacy`). Policy effective date in app: May 4, 2026. |

**Support URL text check**

- In-app support email: `support@reptilita.com` (`src/lib/reptilitaSupport.ts`)
- Terms contact uses same address
- If the marketing site has no dedicated support page yet, add a simple contact section or `/support` redirect before submission

---

## Category

| | |
|--|--|
| **Primary** | Lifestyle |
| **Secondary** | Productivity |

Avoid **Medical** — the app is not a veterinary diagnosis or treatment product.

---

## Age Rating

Target **4+** if questionnaire answers confirm: no unrestricted web browsing, no gambling, no mature themes, no treatment/diagnosis positioning.

- Answer medical-information questions conservatively: educational husbandry and health **records**, not diagnosis or treatment.
- User-generated content: private entries and photos; public share is user-initiated only.
- No native push notifications in this build (do not claim push in metadata).

---

## Copyright

Set in App Store Connect to your legal entity (e.g. `© 2026 [Your Name or Company]`).

---

## App Review Information (summary)

Full detail: `review-notes.md`.

- **Sign-in required?** No for core care tracking.
- **Demo account:** `demo.reptilita@gmail.com` — password in App Store Connect **App Review Information → Sign-in required** (not in public metadata).
- **Notes field:** Paste from `review-notes.md` § App Review Notes (paste block).

---

## Encryption

`ITSAppUsesNonExemptEncryption` = **false** in `ios/App/App/Info.plist` — standard HTTPS only; answer export compliance accordingly in Connect.

---

## Version / Build Reference

| Item | Value |
|------|--------|
| Marketing version | 2.1.0 (`package.json`, Xcode `MARKETING_VERSION`) |
| Build | Confirm `CURRENT_PROJECT_VERSION` in Xcode (App target vs Watch target may differ) |
| Bundle ID | `com.reptilita.app` (`capacitor.config.ts`) |
