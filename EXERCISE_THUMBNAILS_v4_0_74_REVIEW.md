# Gain Focus — Exercise thumbnail review (v4.0.74)
Date: 2026-10-17
Branch: `feature/exercise-photo-thumbnails-20261017`
Status: **Development implementation complete / visual review required / not released**

## Change summary
- Adds `exercise-photo-thumbnails.js`, which overrides v4.0.70's stick-figure thumbnails after the existing exercise specification loads.
- Uses the app's nine embedded photographic exercise-family assets where possible. Each card clearly labels its individual exercise and equipment.
- Uses equipment-only cards for exercises without an appropriate source photo, avoiding incorrect pose illustrations.
- Loads the override after v4.0.70 in `index.html`.
- Updates `service-worker.js` cache version to `gain-focus-v4.0.74-thumbnail-review` and caches the new JS for offline support.
- Keeps the one-time local integration helper to document how the oversized `index.html` was changed. Removes the temporary GitHub Actions workflow after successful integration.

## Automated verification
- `43/43` exercise names in the existing v4.0.70 registry rendered a non-empty named thumbnail in the isolated functional check.
- `36/43` are photographic movement-family references; `7/43` use equipment illustrations: cable crunch, EZ-bar curl, incline dumbbell curl, hammer curl, preacher curl, barbell curl, and cable curl.
- No stick-figure markup is emitted by the new renderer in the test set.
- Dynamic user-supplied names are HTML-escaped in generated thumbnails.
- JS syntax checks, branch-local integration and git diff whitespace checks passed via GitHub Actions run 39049165275.
- GitHub read-back confirmed the loader appears exactly once after the v4.0.70 module and before `</body>`, and the service worker includes the file.
- `main` was not edited or merged.

## Risks / incomplete acceptance
1. Family photographs are **not** guaranteed to depict the exact named exercise and must not be used as form instruction. The exercise-name overlay and technique guide remain the authoritative identification.
2. Seven exercise cards are equipment illustrations, not photographic thumbnails. If a unique actual photo for **every** movement is a release requirement, this gate is still **NOT PASSED**.
3. No interactive browser/screenshot or iOS offline visual test was available during connector-based review. Perform these before release.
4. Historic v4.0.70 figure source remains in the monolithic HTML but its renderer is overridden after module load; future refactoring should remove it when the HTML is split into maintainable files.

## Approval gate
Do not merge to `main`, publish to GitHub Pages, or represent as fully photo-specific until the owner reviews the rendered thumbnails and explicitly approves this exact version.
