# GAIN FOCUS v4.0.47 — Existing User JSON Login

## Requested behaviour
An existing user must be able to enter Gain Focus even when that person has never been saved on the current device. Existing-user login must bypass onboarding and restore the user from Gain Focus JSON data.

## Implemented
- Welcome gate now separates **Existing user** from **New user**.
- **Existing user** opens a JSON login screen and never launches onboarding.
- Client plan JSON is required.
- Matching progress JSON is optional and restores historic workouts, weight, check-ins, nutrition and related progress data.
- A combined `gain-focus-profile-bundle/v1` JSON can be loaded in one step.
- Plan/progress client IDs are validated before login.
- If no progress JSON is supplied, the imported plan opens with a fresh progress record rather than forcing onboarding.
- Successful imported login enters the app directly using `finishOnboardingToApp()`.
- Imported profiles are saved locally after successful login, so they can be selected directly next time.
- Existing saved-profile switching, logout, deletion and full-profile export remain intact.
- The old "I have existing data" / login route now redirects to this same no-onboarding Existing User flow.

## QA
- 15 embedded JavaScript blocks passed `node --check`.
- APP_VERSION verified as 4.0.47.
- Existing-user gate verified.
- Direct app-entry path verified.
- Required plan validation verified.
- Progress/client ID mismatch protection verified.
- New-user onboarding path remains separate.
- Multi-profile v4.0.46 functions remain present.

## Login flow
1. Open Gain Focus.
2. Tap **Existing user**.
3. Choose the client-plan JSON, or a full-profile JSON.
4. Optionally choose the matching progress JSON.
5. Tap **Log in**.
6. Gain Focus enters the app directly; onboarding is not run.
