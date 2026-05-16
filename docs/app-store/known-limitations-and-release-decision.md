# Known Limitations And Release Decision

## Known Limitations

- Reptilita is not a veterinary diagnosis, treatment, emergency triage, or medication app.
- Photo Health is an educational preview only. It must not be marketed as real diagnostic image analysis.
- Native push notifications are not implemented/verified for this readiness pass. Use "schedules" or "in-app reminders" language, not "push notifications."
- The app is local-first. Core records save on the device before any cloud sync path.
- Cloud sync is optional and supports selected records. Some local planning/breeding data may not yet sync everywhere.
- Offline changes are expected to work locally, but offline deletes may require reconnect to finish cloud sync conflict resolution.
- Photos restore after reinstall only where photo sync/storage is implemented and enabled for the signed-in account; otherwise they are local/export/share/import dependent.
- AI-assisted or preview content can be wrong, incomplete, or outdated and must remain informational.
- Public sharing exposes only user-selected data, but users should treat public links as intentionally shared.

## Release Readiness Score

Score: 7.5 / 10 for TestFlight expansion readiness.

Rationale:

- Strong core posture: local-first storage, clear care tracking value, privacy/terms pages, reviewer demo seed, backup/export flows, and no need for product feature changes in this pass.
- Main readiness risk is review/copy precision: App Store assets must avoid overclaiming medical/photo analysis, push notifications, or complete cloud restore if those are not fully implemented for every data type.
- Final TestFlight QA is still required on a real iOS build before App Store submission.

## Blockers

No documentation blocker remains from PASS 6A.

Potential submission blockers to verify outside this docs pass:

- App Store Connect demo credentials must be valid and supplied securely.
- Privacy questionnaire must match the actual production build, enabled Supabase/OpenAI/provider behavior, and any diagnostics SDKs.
- Native iOS build metadata, signing, version/build number, icons, screenshots, support URL, privacy policy URL, and age-rating answers must be completed.
- If App Store screenshots use Photo Health, the screenshot/caption must clearly present it as preview/educational and not diagnostic.
- If marketing copy says restore/sync photos or journal data, verify that exact restore path works in TestFlight.

## Recommended Fixes Before App Store Submission

- Run the full `testflight-qa-checklist.md` on TestFlight, not only in a browser/PWA build.
- Verify reviewer demo account seeding on a clean install with `demo.reptilita@gmail.com`.
- Confirm production privacy policy URL and support URL are accessible without login.
- Confirm App Store listing avoids "diagnose", "treat", "medical advice", and "push notification" language.
- Capture screenshots from stable sample data and review every overlay for App Review safety.
- Confirm backup/import/export works with native iOS share/files behavior.
- Confirm reduced motion, light/dark, safe-area, keyboard, drawer, and overscroll behavior on 6.7-inch iPhone.
- Confirm account deletion/support path is acceptable for App Review expectations.

## Can Wait Until Post-Launch

- Native push notifications for scheduled care reminders.
- Broader cloud sync coverage for every local data type, including all breeding/planning records if not currently synced.
- Stronger photo restore guarantees across devices.
- More advanced account management UI.
- Expanded analytics/diagnostics dashboards.
- Additional screenshot/device localization sets.
- More formal veterinary/legal review if the product later moves closer to medical guidance.

## Release Decision Summary

Recommended decision: proceed to TestFlight expansion after the QA checklist passes, then submit to App Store only after copy, screenshots, privacy answers, and reviewer credentials are verified against the exact production build.

App Store submission should be held if:

- Demo credentials fail.
- Sync/restore claims in copy cannot be reproduced.
- Screenshots imply medical diagnosis or treatment.
- Privacy answers do not match enabled SDKs/providers.
- iOS native export/share, safe-area, or reinstall restore flows fail in TestFlight.
