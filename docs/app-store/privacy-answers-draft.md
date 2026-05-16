# Privacy Answers Draft

This is a plain-English draft for App Store Connect privacy answers. Confirm against the final production build, enabled providers, and legal/privacy counsel before submission.

## Data Types

### User Content

Collected/processed for app functionality when the user enters it:

- Animal names, species, morphs, sex, birth/hatch dates, notes, breeding status, husbandry preferences, and profile metadata.
- Care schedules and task completion records.
- Journal/event entries such as feeding, weight, shed, cleaning, health notes, and general observations.
- Backup/import/export files created by the user.
- Public share content if the user explicitly creates a public profile/share link.

Linked to user:

- Local-only records are not linked to an account unless the user signs in and syncs/shares them.
- Synced records are linked to the signed-in account identifier for app functionality.

Used for:

- App functionality: care tracking, schedule display, history, restore/sync, export, and user-requested sharing.

### Photos

Collected/processed for app functionality when the user adds or selects photos:

- Animal profile photos and photos selected for preview/analysis flows.

Linked to user:

- Local profile photos are stored on the device and are not linked to an account unless synced, shared, exported, or sent through a feature that requires account/cloud processing.
- Synced or shared photos may be linked to the signed-in account or public share selected by the user.

Used for:

- App functionality: showing animal cards/profiles, backup/restore/export/share, and optional educational preview features.

### Identifiers / Authentication

Collected/processed when the user signs in:

- Email address or authentication identifier.
- Supabase user ID/session identifier.
- Optional profile fields such as display name/avatar if provided.
- Pro entitlement flag if applicable.

Linked to user:

- Yes, authentication/account identifiers are linked to the user.

Used for:

- App functionality: sign-in, account session, cloud sync, restore, access control, support, and entitlement checks.

### Diagnostics

May be collected/processed:

- Limited technical logs, sync status, error context, and operational diagnostics needed to run, secure, and debug the service.

Linked to user:

- Some diagnostics may be associated with an account/session if generated during signed-in cloud operations. Local-only browser/device diagnostics may not be tied to an account unless submitted or transmitted by a feature.

Used for:

- App functionality, reliability, security, troubleshooting, and abuse prevention.

### AI / Optional Processing Context

Collected/processed only when the user uses AI-assisted or preview features:

- User prompt/question.
- Optional selected app context such as animal summaries, care tasks, journal excerpts, or photos.
- Optional conversation context.

Linked to user:

- May be linked to the signed-in account when processed through account-gated Pro/server features.

Used for:

- App functionality: generating the user-requested response or preview.

## Data Linked To The User

Likely linked to the user when signed in or using cloud/server features:

- Email/auth identifier.
- User ID/session.
- Synced animal and care records.
- Synced/shared photos if enabled.
- Pro entitlement/profile fields.
- Server-side operational diagnostics associated with the account/session.
- User-selected AI/preview inputs if submitted through a server feature.

## Data Not Linked To The User

Likely not linked to the user when used only locally:

- Local-only animal profiles.
- Local-only schedules.
- Local-only journal entries.
- Local-only profile photos.
- Local backups stored/exported by the user.
- Local app settings.

Note: once the user signs in, syncs, shares, exports, or sends content for optional processing, that content may become linked to the account or selected destination.

## Data Used For App Functionality

All collected/processed categories above are used for app functionality:

- Recording husbandry data.
- Displaying profiles, photos, schedules, and history.
- Restoring/syncing records.
- Exporting or sharing user-selected data.
- Authenticating users.
- Running optional educational AI/preview features.
- Maintaining reliability/security.

No data sale is planned or represented.

## Stored Locally

Primarily stored locally on the device:

- Animal profiles and metadata.
- Journal/care events.
- Schedules and task state.
- Local settings.
- Local photos unless synced/shared/exported/processed.
- Backup/import data created by the user.
- Some breeding/planning data where cloud sync is not yet supported.

## Synced Or Processed In Cloud

May be stored or processed in cloud services when enabled/used:

- Authentication identifiers through Supabase.
- Supported animal records and care schedules through Supabase sync.
- Profile/entitlement data.
- Public share records created by the user.
- Selected AI prompts/context/photos routed through the app's server-side function and model provider for response generation.
- Technical logs and sync diagnostics needed to operate the service.

## App Store Privacy Label Starting Point

Expected high-level answers to verify before submission:

- Data collected: User Content, Photos, Identifiers, Diagnostics.
- Data linked to user: Identifiers, synced user content/photos, account/session diagnostics, optional AI inputs when processed through signed-in/server features.
- Data not linked to user: local-only records and photos that never leave the device.
- Tracking: no cross-app tracking should be claimed unless a tracking SDK or advertising identifier is introduced.
- Third-party advertising: none expected.
