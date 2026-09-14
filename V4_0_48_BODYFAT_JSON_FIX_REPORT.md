# GAIN FOCUS v4.0.48 · Body-fat JSON fix

## Reported issue
Historic body-fat data was present in imported v4.0.42 progress JSON but the Body Comp body-fat graph appeared blank after loading the profile.

## Root cause
The v4.0.45 plateau-zone override replaced `gf30DrawBodyCompTrend`. When tape/body-measurement regions existed, that override drew the plateau-aware tape chart but only called the previous renderer when there were no tape regions. As a result, `#gf30BodyFatChart` was left empty whenever tape measurements were present. The JSON was not being deleted.

## Fix
- Body-fat history is now rendered independently from the tape chart.
- Tape plateau/decline zones remain intact.
- Legacy `progress.bodyCompositionLogs` is preserved without schema conversion.
- Body Comp now visibly summarises latest body fat, starting plan estimate and target body-fat range.
- Existing-user JSON login remains unchanged.

## QA using the exact uploaded test JSONs
- Imported body-composition records: **7**
- First body-fat reading: **12.4%**
- Latest body-fat reading: **12.9%**
- Plan starting estimate: **12–13%**
- Goal range: **13–15%**
- Render test: `#gf30BodyFatChart` produced an SVG while tape measurements were simultaneously present.
- JavaScript syntax: **16/16 script blocks passed `node --check`**.

## Version
`APP_VERSION = 4.0.48`
