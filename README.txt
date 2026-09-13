Gain Focus v4.0.34

Workout UX update: finish/end controls are non-floating at content bottom; load and reps prefill from the previous set or previous workout and remain editable.

Gain Focus PWA v4.0.32
- Hercules Ask bar moved lower on the home screen.
- Start ↔ Goal is visible directly in Profile instead of inside a nested accordion.
- Hercules cosmic app icon retained.

Gain Focus PWA v4.0.20
Analysis hub, smarter visual coaching, guided workout launch, local Hercules form/motivation intelligence, profile-shot focused training, and wordmark home icon.

GAIN FOCUS PWA v4.0.16 — GitHub Pages package

Upload the CONTENTS of this folder to the root of your GitHub repository.
Keep these files/folders together:
  index.html
  manifest.webmanifest
  service-worker.js
  icons/
  .gitignore
  .nojekyll

GitHub Pages setup:
1. Repository > Settings > Pages.
2. Source: Deploy from a branch.
3. Branch: main, folder: / (root).
4. Save and wait for the HTTPS Pages URL.
5. Open the Pages URL in Safari on iPhone.
6. Share > Add to Home Screen.

.gitignore excludes local/editor files, logs, dependencies and secret .env files.
.nojekyll tells GitHub Pages to serve this static PWA directly without Jekyll processing.


GITHUB WEB UPLOAD NOTE
All files, including the three PNG icons, are now in the repository root. No icons folder is required.


V4.0.8
Account/profile editing added: profile picture, name, age, sex, height, current weight, goal weight, experience and equipment. Profile image is stored locally on the device and compressed before saving.


v4.0.9: Onboarding baseline videos now use the normal iOS/browser file picker. No capture attribute is used, so existing videos can be selected from Photos or Files instead of forcing camera capture.


v4.0.10: Hercules input now reads “Ask Hercules anything…”


V4.0.11
- Nutrition labels can be uploaded from Photos/Files.
- OCR foods can be saved as reusable favourites.
- Diet plan now renders only when a real dietPlan object exists in the client JSON, including meals, food quantities, target macros and guidance.


v4.0.16 adds historic check-ins: past date, weight, note, optional saved progress video, optional physique analysis, and historic data on the weight chart.


V4.0.13
- Fixed Nutrition render regression by restoring todayNutritionLogs() and nutritionTotals().
- Check-in and Progress no longer remain blank if another tab throws during rendering.
- Progress JSON restoration now normalises required extras before rendering.
- Service worker cache bumped so GitHub Pages/iPhone receives the repaired build rather than stale v4.0.16.


v4.0.18: baseline front/side/back media optional in onboarding; incomplete-profile alert; Hercules entry progress briefing.


v4.0.18: aligned incomplete-profile alert horizontally with the profile/avatar control across responsive layouts.


v4.0.19: profile setup alert and account/avatar buttons now share one structural flex row for exact horizontal alignment on iOS Safari.


v4.0.22: Compact weekly calendar widget at top of Train with full month view; generated Hercules pre-check-in progress summary and contextual tips.


v4.0.26: Consolidated Analysis (single selectable muscle widget + selectable trend widget + emerging/deviation intelligence + nested history), moved check-in analysis to Check-in, Start/Goal to Profile, shared Hercules header and guided Help FAQ. Start/onboarding unchanged.

v4.0.27: Fixed the consolidated Muscle Development selector so Conditioning, Strength and Visual Mass render the full front/back muscle map. All comparison modes now use a cool blue heat scale and show a cold baseline map when no historic comparison data exists.
