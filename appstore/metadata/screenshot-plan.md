# Screenshot Plan — Reptilita 2.1.0

Premium, calm, husbandry-focused visuals. **No** veterinary diagnosis language, treatment claims, or “push notification” wording. Use real in-app UI; overlays are marketing captions only.

---

## Device Requirements

| Slot | Device / size | Required? | Notes |
|------|----------------|------------|--------|
| **iPhone 6.7"** | iPhone 15 Pro Max / 14 Pro Max simulator (1290×2796 or 1320×2868) | **Yes** — primary set | Capture 3–10 screens; Apple often shows 6–8 |
| **iPhone 6.5"** | iPhone 11 Pro Max class (1242×2688) | **Only if** Connect still requires legacy size for your account | Many accounts auto-scale from 6.7"; export 6.5" if validation fails |
| **Apple Watch** | Series 9 / Ultra 2 simulator (Watch app screenshots) | **Recommended** for 2.1.0 | Highlights companion; pair with iPhone frame in marketing optional |

**Build before capture:** `npm run release:ios` → run on device/simulator with seeded demo data or reviewer account.

---

## Sample Data Baseline

Use **demo.reptilita@gmail.com** on a clean install **or** manual library:

| Animal | Species | Story on screen |
|--------|---------|-----------------|
| Orion | Ball Python, Mojave, male | Feeding due soon; routine check due today |
| Vega | Ball Python, female | Cleaning this week |
| Pip | White’s Tree Frog | Insect feeding; journal activity |

Also include:

- 1 **overdue** recurring task (for Today drama, not alarmist copy)
- 1 **completed** task today
- 4–6 **journal** entries (feeding, shed, weight, cleaning, note — no “diagnosed” / “prescribed” text)
- Watch: overdue ≥1, due today ≥1, visible **Feed / Clean / Mist**

---

## iPhone 6.7" — Six-Screen Set

### Screen 1 — Today dashboard

| | |
|--|--|
| **Overlay title** | Today's care, at a glance |
| **Overlay caption** | Due, overdue, and done—one calm daily view. |
| **Route** | `/today` |
| **Scene** | Progress ring or summary visible; 2–3 task cards; one animal focus chip if shown |
| **Avoid** | Empty state; cropped bottom nav |

---

### Screen 2 — My Animals

| | |
|--|--|
| **Overlay title** | Every animal, organized |
| **Overlay caption** | Photo cards for reptiles and amphibians. |
| **Route** | Reptiles / My Animals list |
| **Scene** | 3+ animals with photos; readable names and species |
| **Avoid** | Placeholder avatars only; debug banners |

---

### Screen 3 — Animal profile & care context

| | |
|--|--|
| **Overlay title** | Profiles that remember |
| **Overlay caption** | Schedules, history, and husbandry details together. |
| **Route** | Animal detail (e.g. Orion) |
| **Scene** | Header photo, species/morph, schedule section or insights (informational tone) |
| **Avoid** | “Diagnosis”, “treatment plan”, red alert health claims |

---

### Screen 4 — Care journal / history

| | |
|--|--|
| **Overlay title** | A clear care journal |
| **Overlay caption** | Feedings, sheds, weights, cleanings, and notes over time. |
| **Route** | Journal tab or profile history |
| **Scene** | 5+ dated entries, mixed event types |
| **Avoid** | Medical outcome promises in sample note text |

---

### Screen 5 — Schedules / Today overdue (pick one)

**Option A — Schedules**

| | |
|--|--|
| **Overlay title** | Flexible care schedules |
| **Overlay caption** | Strict routines and softer reminders. |
| **Route** | Schedule editor or profile schedules |
| **Scene** | Feed frequency, next due dates visible |

**Option B — Overdue catch-up**

| | |
|--|--|
| **Overlay title** | Catch up without chaos |
| **Overlay caption** | Reset or roll forward overdue routines. |
| **Route** | Today → overdue drawer |
| **Scene** | Safe actions: mark done, reset from today, roll forward |

---

### Screen 6 — Apple Watch companion (hero for 2.1.0)

**Composition:** iPhone 6.7" frame showing **Today** (left or background) + Watch screenshot inset, **or** standalone Watch export if Connect accepts Watch-only slot.

| | |
|--|--|
| **Overlay title** | Care from your wrist |
| **Overlay caption** | Apple Watch Today snapshot and quick Feed, Clean, Mist. |
| **Watch scene** | `WatchCareTodayView`: progress %, Overdue/Due/Done, Next task, Quick Actions |
| **iPhone scene** | Today tab with matching counts |
| **Caption footnote (small)** | iPhone syncs your library; open the app to refresh Watch. |

**Avoid:** Implying Watch works fully offline without ever opening iPhone.

---

### Optional Screen 7 — Local-first / backup (Settings)

| | |
|--|--|
| **Overlay title** | Your data, your device |
| **Overlay caption** | Local-first care with export and optional cloud sync. |
| **Route** | Settings — backup, export PDF, sync row (signed-in state only if stable) |
| **Avoid** | “Automatic cloud backup of everything” unless verified in TestFlight |

---

## iPhone 6.5" — If Required

Re-export the same six compositions from **iPhone 11 Pro Max** (or scale in App Store Connect if allowed).

Checklist:

- [ ] No clipped home indicator or status bar
- [ ] Overlay safe margins match 6.7" set
- [ ] Same copy and scene order as 6.7"

---

## Apple Watch — Dedicated Shots

Capture on **45mm or 49mm** Watch simulator with companion installed.

| # | Screen | Overlay (optional on frame) | State |
|---|--------|----------------------------|--------|
| W1 | Today summary | Today on your wrist | Overdue/Due/Done + progress ring + animal name |
| W2 | Next task | Next up | Visible feed or clean task with animal name |
| W3 | Quick Actions | Feed · Clean · Mist | Three buttons visible, not loading spinners |
| W4 | Sync prompt (optional) | Open iPhone to refresh | Empty/connecting state—use only if explaining sync; keep copy honest |

**Watch capture steps**

1. Install build on Watch + iPhone pair.
2. Seed tasks on iPhone (demo account).
3. Open Reptilita on iPhone (Today) 10s.
4. Screenshot Watch app (⌘S in Simulator).

---

## Overlay Design System

| Rule | Value |
|------|--------|
| **Title** | 3–6 words, semibold, high contrast |
| **Caption** | One line, ≤12 words |
| **Placement** | Top third or bottom third; never cover primary CTAs |
| **Font** | SF Pro or brand match; consistent across set |
| **Background** | Subtle gradient behind text only; do not blur critical UI |
| **Palette** | Teal/green accents aligned with app (`#2a9d8f` theme) |

---

## Copy Do / Don’t

| Do | Don’t |
|----|--------|
| “Care tracking”, “journal”, “schedules”, “Today tasks” | “Diagnose”, “treat”, “prescribe”, “vet-approved cure” |
| “Apple Watch companion”, “quick actions” | “Push alerts” (not in this build) |
| “Local-first”, “optional sync” | “HIPAA”, “clinical”, “FDA” |
| “Informational preview” for Photo Health | “AI diagnosis from photos” |

---

## Pre-Upload Screenshot QA

- [ ] Status bar: full signal/Wi‑Fi/time (or clean simulator 9:41)
- [ ] Light mode set complete; optional dark mode alternate set
- [ ] No `DEV`, test banners, or `VITE_MOCK` artifacts
- [ ] Demo marker stripped if visible (`stripDemoMarker` / sample labels)
- [ ] Watch counts roughly match iPhone Today on same seed
- [ ] All overlay text proofread
- [ ] PNG, sRGB, no alpha issues per Apple specs

---

## File Naming Convention (internal)

```
iphone67_01_today.png
iphone67_02_animals.png
iphone67_03_profile.png
iphone67_04_journal.png
iphone67_05_schedules.png
iphone67_06_watch_companion.png
watch_01_today_summary.png
watch_02_quick_actions.png
```

Store exports outside repo or in `appstore/screenshots/` (gitignored) if large binaries are not committed.
