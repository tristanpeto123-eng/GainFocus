# Gain Focus UX roadmap v1.0 — Phase 00 and Phase 01 implementation contract

Status: DRAFT / OWNER APPROVAL REQUIRED BEFORE CODE CHANGES OR MERGE.
Source: GainFocus Visual UX Audit, 21 October 2026 (observed live v4.0.73).

## Verified repository baseline
- Repository: tristanpeto123-eng/GainFocus; main head inspected: b396fc9ad99a53db3ba04a852ae843e18a82c322 (19 October 2026).
- README identifies v4.0.48; package.json identifies v4.0.45; live audit identifies v4.0.73. These metadata discrepancies DO NOT establish deployed-code mismatch.
- Root index.html exists, but GitHub text fetch returned no readable contents; full frontend internals remain unverified.
- package.json: Node/Express 5 and web-push; server.js serves static files and push endpoints, with push-state.json persistence.
- service-worker.js precaches index.html, nutrition modules and gain-focus-workout-recovery.js.
- nutrition-portions.js wraps renderNutrition and dynamically inserts barcode UI; nutrition-barcode.js handles scanning and Open Food Facts lookup.
- gain-focus-workout-recovery.js implements pending workout detection, explicit discard/partial-save confirmation and emergency escape. Audit issue may be partly mitigated; test before changing.
- No claims made about complete profile schema, actual deployment parity, accessibility compliance or test-suite coverage.

## Phase 01 work packages (do not implement until approved)
| ID | Audit issue | Required behaviour | Acceptance tests |
| --- | --- | --- | --- |
| GF-UX-001 | P1 stacked sheets | Exactly one active focus-owning modal; close restores parent and draft | Nested edit from onboarding and group creation; Escape/back; keyboard focus return |
| GF-UX-002 | M25–M28 food capture | Capture method changes preserve open sheet and entered data | Photo->Manual->Photo, Barcode->Manual, no lost values; mobile |
| GF-UX-003 | M07 calendar tap | Tap views day details; only explicit edit commits; undo supported | Tap does not mutate; edit/confirm persists; cancel unchanged |
| GF-UX-004 | M47 measurement entry | Add first measurement opens usable form | Empty profile, save, edit, reload and restore |
| GF-UX-005 | M35–M38 energy/history | One authoritative target/calculation source and provenance; no fabricated history | Settings vs planner same input yields same values; missing-data states |
| GF-UX-006 | M23 workout recovery | Normal Resume/Pause/Discard; diagnostics restricted to advanced recovery | Existing unfinished, orphaned and completed logs; no history loss |
| GF-UX-007 | M63 import navigation | Manage profiles -> Restore from file opens correct import flow | Valid/invalid JSON, cancellation, full backup round trip |

## Cross-cutting engineering safeguards
1. Before coding, obtain a readable copy of the actual deployed HTML/JS, identify all writers/readers of user data, and compare deployed asset hashes with the repository branch.
2. Capture a synthetic-profile baseline and full-profile export; confirm reversible migration or no migration.
3. Do not change persistent schema silently; if necessary, version migration and test backward compatibility.
4. Maintain current Hercules visuals and direct workout/food/check-in shortcuts.
5. Run browser tests on desktop and physical iPhone Safari; include keyboard, focus, modal and offline/PWA cases.
6. Preserve completed workouts, planned sessions, historical nutrition, body composition, media references and original programme restore.
7. Create one code PR per coherent repair; link audit IDs, before/after evidence, regression tests and rollback instructions.
8. Checker gate: PASS/FAIL/BLOCKED per work package. No merge/deployment without explicit owner approval of exact PR/version.

## Blocking investigation questions
- What build/asset version is currently deployed and where? The audit's v4.0.73 may include uncommitted/untracked changes.
- Where is the full HTML application source and what mechanisms save profile/plan/progress/nutrition?
- What existing browser test runner and fixtures are available?
- Does the latest recovery module resolve the audit's observed diagnostic leakage in the deployed environment?
- How is nutrition TDEE calculated in every screen and where are historical weigh-ins read?

## Approval gate
Approval requested for implementation of Phase 01 only after the blocking questions are resolved and Checker verifies a file-level plan. This draft PR contains planning documentation only, not fixes.
