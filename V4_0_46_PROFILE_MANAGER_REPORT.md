# GAIN FOCUS v4.0.46 · Profile Manager QA Report

## Requested profile/data controls

| Requirement | Status | Implementation |
|---|---|---|
| Log out from Profile | PASS | `gf46Logout()` saves the current snapshot, clears the active session, returns to the profile gate, and keeps saved profiles. |
| Delete current data | PASS | `gf46DeleteCurrentProfile()` deletes only the active profile after confirmation, including saved plan/progress entry, scoped profile photo, known baseline/check-in media and scoped local state. |
| Switch profile | PASS | `gf46OpenProfileManager()` lists saved profiles; `gf46ActivateProfile()` swaps plan/progress and profile-scoped state. |
| Create new profile without losing current profile | PASS | `gf46StartNewProfile()` snapshots current data and opens the full onboarding flow with a clean active session. |
| Load existing client JSON | PASS | Multi-file JSON picker accepts existing Gain Focus client-plan JSON. |
| Load matching progress JSON | PASS | The same picker accepts the matching progress JSON and validates `clientId` against the plan before activation. |
| Combined profile import/export | PASS | `gain-focus-profile-bundle/v1` contains plan + progress and can be exported/imported as one file. |
| Preserve existing v4.0.45 data | PASS | Legacy active profile is automatically migrated into `gainFocusProfileVaultV1`; original plan/progress objects are not rewritten during bootstrap. |
| Profile-specific Hercules/social/plateau state | PASS | These local states are captured in each vault entry and restored on switch. |
| Avoid cross-profile push reminders | PASS | Hosted build unsubscribes the previous profile on switch/logout/delete and reattaches the active profile when appropriate. |
| Backend unsubscribe route | PASS | `/api/push/unsubscribe` removes the selected profile from `push-state.json`. |

## UX locations

Profile → Settings now contains:
- Switch / manage profiles
- Load existing JSONs
- Export full profile
- Log out
- Delete current profile data

The logged-out entry screen also shows saved profiles directly and offers:
- Load existing JSONs
- Create new profile

## Data behavior

- **Logout:** active session cleared; saved profile remains available.
- **Switch:** current profile is snapshotted before the target profile is activated.
- **New profile:** old profile remains in the local profile vault.
- **Import:** accepts either two existing JSON files (plan + progress) or one combined profile bundle.
- **Delete:** destructive and profile-specific; it does not clear the entire Gain Focus database or other profiles.

## Static QA

- HTML JavaScript blocks parsed with Node `--check`: **14 / 14 PASS**.
- Push server parsed with Node `--check`: **PASS**.
- Existing v4.0.45 FINAL source used as the base: **PASS**.
- Required profile-manager function markers present: **PASS**.
- Push unsubscribe endpoint present: **PASS**.

## Production boundary

Profiles in this build are local-device profiles. True account login/sync across phones still requires the authenticated backend/database layer. The Profile Manager data model is structured so local profiles can later map to authenticated account IDs.
