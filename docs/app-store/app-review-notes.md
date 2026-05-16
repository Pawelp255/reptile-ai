# App Review Notes Draft

## What The App Does

Reptilita is a local-first reptile and amphibian care organizer. Users can create animal profiles, add photos, track feeding/cleaning/routine care schedules, mark tasks done, record journal events, view animal history, export care records, create backups, and optionally sign in for cloud sync of supported records.

The app is for husbandry organization, record keeping, and educational care support. It is not a medical or veterinary diagnosis app.

## Demo / Reviewer Account

Use the dedicated reviewer account if credentials are provided in App Store Connect:

- Demo account email: `demo.reptilita@gmail.com`
- Password: provide separately in the secure App Review credentials field.

On first sign-in with an empty library, the app automatically adds sample animals, schedules, journal entries, and a pairing example for review. This is normal app behavior gated to the reviewer account; there are no hidden gestures or reviewer-only UI flows.

If App Review is not given credentials, the app can still be reviewed by creating a new account or using local-only flows. Sample data may also be available where enabled in the build.

## Local-First And Optional Cloud Sync

Reptilita saves user data locally on the device first, using browser/native local storage technologies such as IndexedDB. The user can use the app without cloud sync for core record keeping.

If a user signs in, supported animal and care schedule records may sync through Supabase so they can be restored or used across sessions/devices. Sync is intended for app functionality and is associated with the signed-in account. Some advanced/local planning records may remain local until sync support is expanded.

## No Medical Or Veterinary Diagnosis

Reptilita does not diagnose, treat, prescribe, or provide emergency veterinary triage. Care insights, AI-assisted content, genetics tools, schedules, and health notes are informational and for record keeping only. Users are instructed to consult a licensed reptile-experienced veterinarian for medical concerns, emergencies, medication, diagnosis, or treatment.

## Photo Health Preview

Photo Health is an educational preview. In the current implementation it returns illustrative preview guidance after a user chooses a photo. It is not a diagnostic feature and should not be represented as veterinary analysis. Any photo-related guidance must be treated as informational only.

## Push Notifications

Do not claim native push notifications in App Review or marketing unless native push has been implemented and verified. Reptilita currently includes in-app schedules/reminders and exportable calendar support, but no native push-notification claim should be made for this submission.

## Privacy Explanation

User-created animal profiles, photos, schedules, journal events, backups, and exports are primarily stored locally on the device. If the user signs in or enables sync, supported records may be stored in Supabase and linked to the account identifier for app functionality.

Photos used as profile photos or local records remain local unless the user chooses a feature that syncs, exports, shares, or sends them for optional processing. Pro/AI features may send selected prompts, selected app context, and optional images through the app's server-side function to a model provider to generate a response. API credentials are not embedded in the app binary for that path.

The app may collect limited diagnostics or technical logs needed to operate and secure the service. The app does not sell personal information.

## Review Safety Notes

- App purpose: husbandry tracking and care organization.
- No diagnosis/treatment claims.
- No native push notification claim unless implemented before submission.
- Local-first design, optional cloud sync.
- Public sharing only publishes data the user explicitly shares.
- Backup/import/export tools are user initiated.
