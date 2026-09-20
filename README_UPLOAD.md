# Gain Focus PWA v4.0.73 — GitHub Pages upload package

Upload the CONTENTS of this folder to the root of:
`tristanpeto123-eng/GainFocus`

Overwrite the existing files with the same names.

## Included
- `index.html` — full Gain Focus app, version bumped to 4.0.73
- `manifest.webmanifest` — restored PWA manifest
- `service-worker.js` — cache bumped to v4.0.73 and includes the UX patch
- `ux-credit-free-patch.js` — latest mobile UX pass, now loaded directly by `index.html`
- PWA / iOS icons

## v4.0.73 changes
- Integrates the 19 Sep credit-free UX patch into the actual app load path.
- Home/Hercules becomes more action-first while retaining Hercules.
- Adds compact Today status/actions for training, nutrition and weekly check-in.
- Adds an Ask Hercules shortcut on non-Home tabs.
- Moves the muscle heat map higher on Progress.
- Improves iPhone safe-area spacing and touch target sizing.
- Keeps the intro `Tap to open` action and makes the intro button explicitly `type=button`.
- Restores the missing `manifest.webmanifest` from the v4.0.72 ZIP.
- Bumps all service-worker registrations/cache keys to 4.0.73 to prevent stale GitHub Pages caching.

No client-plan, progress, workout, nutrition or onboarding JSON schemas are changed by this update.
