# Final TestFlight QA Checklist

Use this checklist on a clean TestFlight install and again on an upgrade from the prior build.

## Install, Account, Restore

- [ ] Fresh install opens without crash.
- [ ] New local-only user can create an animal without signing in.
- [ ] Sign-in flow completes for a test account.
- [ ] Sign-out and sign-in preserve/restore expected synced records.
- [ ] Reinstall, sign in, and confirm supported cloud-synced animals/schedules restore.
- [ ] Reinstall without sign-in starts clean or shows expected local-only empty state.

## Photos

- [ ] Add profile photo from library.
- [ ] Take/add photo on device if camera permission is enabled for the build.
- [ ] Photo appears on animal card and profile.
- [ ] Photos persist after app restart.
- [ ] Photos restore after reinstall/sign-in only where photo cloud sync is implemented and expected.
- [ ] Large photo is handled without app crash.

## Journal / Events

- [ ] Add feeding event.
- [ ] Add shed/weight/cleaning/health note/general note.
- [ ] Journal/profile history refreshes after save.
- [ ] Events persist after app restart.
- [ ] Events restore after reinstall/sign-in if synced; otherwise confirm limitation is documented.

## Schedule Modes

- [ ] Create or edit strict recurring feeding/cleaning/check schedule.
- [ ] Create or edit flexible reminder if available in the UI.
- [ ] Today view correctly shows due-today strict tasks.
- [ ] Week view correctly shows upcoming strict tasks.
- [ ] Flexible reminders do not incorrectly count as overdue if designed that way.

## Overdue Catch-Up

- [ ] Create or seed overdue repeating reminders.
- [ ] Open overdue catch-up controls.
- [ ] Reset/start fresh moves next reminder forward from today.
- [ ] Roll forward/skip overdue advances past-due reminders correctly.
- [ ] Mark overdue done creates expected completion state/history.
- [ ] One-off reminders are not unintentionally bulk-updated.

## Edit / Delete Events

- [ ] Edit animal profile details.
- [ ] Delete animal only after confirmation.
- [ ] Add event, then delete event after confirmation.
- [ ] Deleted local records do not reappear after app restart.
- [ ] If signed in, reconnect and verify deletes resolve as expected with sync.

## Export / Share PDF

- [ ] Export PDF with at least one animal and several events.
- [ ] Native share sheet or file export opens successfully.
- [ ] PDF filename is clear.
- [ ] PDF content contains expected animals/events.
- [ ] Export failure state is graceful if share/download is unavailable.

## Backup / Import

- [ ] Export full backup JSON.
- [ ] Import backup into a clean install.
- [ ] Import review/confirmation step appears before applying.
- [ ] Imported animals, schedules, and events are present.
- [ ] Duplicate/merge behavior is understandable and does not corrupt existing records.
- [ ] Optional upload-after-import/sync behavior works only when signed in and online.

## Offline / Reconnect

- [ ] Launch app offline with existing local data.
- [ ] Create or update local record while offline.
- [ ] Mark task done while offline.
- [ ] Return online and confirm sync status/updates recover gracefully.
- [ ] Offline delete behavior is tested; if reconnect is required to finalize cloud deletes, note it clearly.

## Accessibility / Motion

- [ ] Reduced Motion setting produces usable screens without disruptive animation.
- [ ] Main flows are tappable with expected hit targets.
- [ ] Dynamic Type / larger text does not make critical controls unusable.
- [ ] VoiceOver labels are acceptable for main navigation and primary controls.

## Light / Dark Mode

- [ ] Light mode: Today, Animals, Profile, Journal, Settings.
- [ ] Dark mode: Today, Animals, Profile, Journal, Settings.
- [ ] System mode follows device appearance.
- [ ] Cards, dialogs, forms, and empty states remain readable.

## iOS Safe Area / Overscroll

- [ ] Top status bar does not overlap page headers.
- [ ] Bottom nav and sticky actions respect home indicator safe area.
- [ ] Drawers/modals fit above the home indicator.
- [ ] Scroll boundaries do not reveal broken backgrounds.
- [ ] Keyboard does not hide required form actions.
- [ ] Long pages remain scrollable without trapped controls.

## App Review Safety

- [ ] No screenshot or copy claims veterinary diagnosis/treatment.
- [ ] No screenshot or copy claims native push notifications unless implemented.
- [ ] Privacy policy and terms are reachable.
- [ ] Demo/reviewer account works and seeds sample data once.
- [ ] Account deletion/support path is visible or documented for review.
