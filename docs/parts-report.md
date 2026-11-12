# Parts C / D / E / F / G / I — what changed, why it broke, what is left

This is the working record for the five screenshots. It lists the root cause of
each defect (file + line at the time of the fix), what now holds the behaviour
together, and the parts of the brief that are **not** done yet — so nothing is
reported as finished that is not.

---

## 1. Screenshot 1 — “Optional” badge, blocking error, error printed twice

**Root cause (three sources of truth for one rule):**

| Where | What it decided |
| --- | --- |
| `src/convex/storage/validation.ts` (`requiredForCertified`) | the upload badge |
| `src/lib/facilityProfileRules.ts` `validateNqasDraft` (old lines ~575–583) | “a certified result needs the result sheet” → blocked Save |
| `src/components/profile/ProfileFormKit.tsx:110-121` `FieldFrame` | printed **“Optional”** whenever the caller did not pass `required` |

`AssessmentForms.tsx` never passed `required` and passed the same error object to
both `FieldFrame` and `Dropzone`, so the sentence rendered twice.

**Fix:**

* `src/lib/documentRules.ts` — one rule per document (`mandatory` / `optional` /
  `required when…`, blocking or warning, cycle scope) with
  `resolveDocRequirement()` producing the badge text, the reason and the
  blocking flag from the *same* input. Defaults: NQAS Certified Result =
  required when certified, blocking; the other five = optional.
* `src/convex/documents.ts` `listForFacility` evaluates the rule against the
  current cycle’s assessment (newest row), gap-closure amount, building status
  and Fire NOC, and returns `requirements`, `requiredMissing`,
  `blockingMissing` plus the requirement on every document row.
* `src/components/documents/DocumentField.tsx` renders the badge from that
  resolved rule (never from a second hard-coded flag).
* `src/components/profile/AssessmentForms.tsx` passes `required` from the same
  rule, renders the error once, and says “NQAS Certified Result”.
* `src/lib/facilityProfileRules.ts` `validateNqasDraft` takes `resultDocRule`
  and only blocks when `required && blocking`.

Tests: `scripts/documentRules.test.ts` (13 cases) — each mode, each condition,
the blocking set, and “exactly one issue”.

## 2. Admin → Documents tab (Part C)

`Admin` → **Documents** tab (`src/components/admin/DocumentsRulesPanel.tsx`):

* rule picker per document, condition picker, Blocking/Warning switch,
  accepted types and the single max size (read-only, from the server config),
  cycle scope;
* saving writes `appSettings.documentRules` through the existing `setSetting`
  mutation, so the change is **audited with the old and new value** and applies
  instantly — every screen already subscribes to that table.
* Deep links: `/admin/documents` and `/admin/google-drive` open the same page on
  the right tab (`src/main.tsx`).

## 3. Screenshot 2 — the six-document panel (Part E)

`src/components/profile/DocumentsCard.tsx` + the new compact branch in
`DocumentField`:

* header line: `Documents · n of 6 uploaded · k required missing`, Storage chip,
  Cycle chip, **Choose files**;
* rows are 44 px: icon, name, requirement badge, state chip (Uploaded /
  Required / Not uploaded / File missing in Drive), file name · size · date,
  and Upload / Replace · Preview · Download · Remove;
* the **whole section is the drop target** with a highlighted overlay; per-row
  drop still forces the type, anywhere else classifies the file;
* Hide / Show collapses to one line, remembered per facility in
  `localStorage` (`documents:collapsed:<facilityId>`);
* removed: the big dashed box per row, the second pending banner, the
  “Not part of the six document count” line, and the duplicated required-file
  sentence. Limits/types come only from `documentsConfig`.

## 4. Screenshot 3 — quarters and the comparison (Part G)

**Root cause:** the labels were derived from the *calendar* current quarter
whenever the per-facility quarter index was empty (the fallback documented in
`src/lib/iaMaster.ts`, `withLegacyIa`), and the comparison then subtracted a
quarter that had no row — hence `—`. October 2026 is Q3, so stored Q1 printed
as “Q2” and stored Q2 as “Q3”.

**Now:** `facilityIaPair()` / `iaPairFor()` use **only** stored periods
(latest = Q2 2026-27, previous = Q1 2026-27), `withIaPeriodLabels()` names those
exact quarters, and `iaCompareOf()` returns `latest − previous` rounded to
`SCORE_DECIMALS`, `null` when either side is blank (UI prints “-” with a
reason).

Tests: `scripts/iaQuarters.test.ts` — Kavalurchatram NQAS 93.3 → 93.34 = **▲
+0.04**, Kayakalp 93.4 → 92.9 = **▼ −0.50**, one-quarter facility = `null`,
blank tracker = `null`, and no “Q3 2026-27” column can appear.

## 5. Screenshot 4 — surveillance helper text (Part H, partial)

The due-date rows said “Imported in Bulk Import or edited in the Facility
Profile” because `readOnlyCellReason()` had a single fallback for every column
that was not identity/derived. Fixed:

* `survDue1` → “Calculated automatically from the GoI letter date + 12 months”
* `survDue2` → “… + 24 months”, `recertStatus`/`recertYear`, `nextAction`,
  `saqshamNameCategory`, `documentsStatusReport` each name their rule;
* `FieldRow` treats the due dates and recert fields as derived (lock icon +
  that explanation) instead of import-only.

**Not done in Part H:** the remaining claims of the brief — one `FieldEditor`
per type across all four screens, future-date/score-without-date validation for
surveillance in every surface, and the “lists done dates after today / equal to
the due date” confirmation flow are only partly present (the read-only audit
query `facilities.surveillanceDateAudit` exists; the confirm/clear UI is not
wired).

## 6. Screenshot 5 — user menu (Part I ②)

`src/components/AppSidebar.tsx`: the popover is gone; the avatar + name are a
link to `/profile` (with the “My profile” tooltip in the rail) and **Sign out**
is a visible footer button in both the expanded sidebar and the rail.

---

## Still open (not delivered — do not count these as done)

1. **Part H** — full unification of the editor system and the surveillance
   migration confirmation screen.
2. **Part C ③** — flagging facilities that now miss a required file inside the
   existing Needs-attention list (the panel and the row badges show it; the
   bell list is unchanged).
3. **Part I ①** — the requested tab bar (General / Table & Display / Google
   Drive / Documents / Users and roles / Audit and logs). The Drive panel and
   the Documents tab are reachable at their own URLs, but the tab names and
   grouping are still the previous ones (Master data / Users / Documents /
   Workspace / Maintenance).
4. **Part K** — no measurement table, no CI bundle/timing budget, no Playwright
   timing tests. Nothing in this change should be reported as faster.
5. **Playwright** suites for A–I are not added; verification is the unit/DOM
   suite (`bun test scripts`, 800 passing) plus `tsc -b --noEmit`.

## Assumptions

* “Certified or conditional” = `Quality Certified` or
  `Quality Certified with Conditionality` (Deferred does not make documents
  mandatory).
* A rule change never rewrites stored data: it only changes what the badge, the
  save gate and the counts say from that moment.
* Cycle scope is stored with the rule but the current upload path still files by
  the facility’s `currentCycleNumber`; switching a document to “per facility”
  does not move existing files.
