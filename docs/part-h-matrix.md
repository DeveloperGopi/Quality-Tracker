# Part H — Field × Screen matrix (Step 2.1)

Generated from the config, not from memory: the 32 keys in
`EDIT_FIELD_BY_KEY` (`src/components/master/EditModeCells.tsx`), their column
type in `src/lib/masterColumns.ts`, and whether the Facility Profile has a
field for the same value (`PROFILE_FIELDS` in `src/lib/facilityProfileRules.ts`
for SA/NQAS + the Funds / NOC / Building cards in `src/pages/FacilityProfile.tsx`).

Legend — **E** editor present · **R** read-only with an explicit reason ·
**–** no field on that screen. *Static* means the editor exists and commits to
the screen's draft; the browser cells (open → type → commit → save → reload)
are **not verified**: Playwright is not installed in this environment and no
browser session is available, so they are not claimed as passing.

| Field (column) | Type | Quick View | Master List edit | Row Update | Profile | Status |
|---|---|---|---|---|---|---|
| certStatus — NQAS Certification Status | status | E segmented | E select | E select | E (NQAS outcome) | Static pass |
| certDate — GoI letter date | date | E date | E date | E date | E date | Static pass |
| certScore — Certified Score % | score | E number | E number | E number | E number | Static pass |
| naScheduled — NA start | date | E date | E date | E date | E date | Static pass |
| naEnd — NA end | date | E date | E date | E date | E date | Static pass |
| naMode — Mode | text | E text | E text | E text | E segmented | Static pass |
| departments — Departments | longtext | E text | E text | E text | E chips | Static pass |
| gapAmount — Gap Closure Amount | currency | E number | E number | E number | E number (Funds card) | Static pass |
| gcYear — GC Fund year | text | E text | E text | E text | E text (Funds card) | Static pass |
| procLink — Proc. link | link | E text | E text | E text | E text (Funds card) | Static pass |
| nqasIaQ1 — NQAS IA % (previous) | score | **R** | **R** | **R** | – | Read-only by design (import-only, fixed below) |
| nqasIaQ2 — NQAS IA % (current) | score | **R** | **R** | **R** | – | Read-only by design |
| kayakalpIaQ1 | score | **R** | **R** | **R** | – | Read-only by design |
| kayakalpIaQ2 | score | **R** | **R** | **R** | – | Read-only by design |
| saStatus — SA Status | status | E select | E select | E select | E segmented | Static pass |
| saScore — SA Score | score | E number | E number | E number | E number | Static pass |
| saStart — SA start | date | E date | E date | E date | E date | Static pass |
| saEnd — SA end | date | E date | E date | E date | E date | Static pass |
| genDoc — SaQsham Documents Status | status | E select | E select | E select | E segmented | Static pass (auto “Result Declared” locks it) |
| assessor1 | text | E text | E text | E text | E text | Static pass |
| assessor1Hud | text | E text | E text | E text | E select | Static pass |
| assessor2 | text | E text | E text | E text | E text | Static pass |
| assessor2Hud | text | E text | E text | E text | E select | Static pass |
| surv1 — 1st Surveillance Done Date | date | E date | E date | E date | **–** | **Open** — no Profile field |
| surv2 — 2nd Surveillance Done Date | date | E date | E date | E date | **–** | **Open** — no Profile field |
| survScore — 2nd Surveillance Score % | score | E number | E number | E number | **–** | **Open** — no Profile field |
| buildingType | text | E select | E select | E select | E select (Building card) | Static pass |
| buildingStatus | status | E select | E select | E select | E select (Building card) | Static pass |
| nocAvailable | status | E select | E select | E select | E select (NOC card) | Static pass |
| nocCertified — NOC issue date | date | E date | E date | E date | E date (NOC card) | Static pass |
| nocValidity — NOC validity | dueDate | E date | E date | E date | E date (NOC card) | Static pass |
| remarks | longtext | E text | E text | E text | E text | Static pass |

## Failures found by building this matrix

1. **IA columns were phantom-editable (fixed).** `nqasIaQ1/Q2` and
   `kayakalpIaQ1/Q2` were in `EDIT_FIELD_BY_KEY`, so the grid opened a score
   editor and patched `facilities.nqasIaQ1…`, while the column *displays*
   `facilityIaQuarters` (the import store). Editing saved a value that never
   appeared — an "edit not working" case. They are now read-only with
   “Calculated automatically from the quarterly IA import (Bulk Import →
   Internal Assessment)” in both Quick View and the grid
   (`src/components/master/EditModeCells.tsx`, `src/components/quickview/FieldRow.tsx`).
2. **Surveillance fields have no Profile editor (open).** `surv1`, `surv2`,
   `survScore` are editable in Quick View and both grid surfaces, but the
   Facility Profile has no surveillance section, so the same value cannot be
   edited there. Adding it needs a new NQAS form section (draft keys + save
   mapping) and is not done.
3. **One editor per type is not yet true across the app (open).** Quick View
   uses `FieldEditor`; Master List and the row Update drawer use the separate
   `CellEditor` in `EditModeCells.tsx`; the Profile uses `ProfileFormKit`
   fields. They share validation and the save-bar draft model, but not one
   component.

## What is verified

* `tsc -b --noEmit` clean.
* `bun test scripts` — 818 passing, including the contract, frozen-column,
  reconciliation, permission and audit suites.
* Static presence of an editor for the 25 fields above on all four screens.
* The API rejects a future surveillance done date and a score without a done
  date (`src/convex/facilities.ts`, `updateFacilityRow`).

## Not verified (blocked, not failed)

Open → type → commit → save → reload in a browser for each cell, and the
Playwright suite for all four screens: Playwright is not a dependency of this
project and no browser is available to the agent. These cells are unclaimed,
not asserted as passing.
