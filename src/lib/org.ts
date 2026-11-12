/**
 * ONE organisation name for the whole product (Part 0 of the deck brief).
 *
 * The department was renamed from "State Health Department" to
 * "District Quality Assurance Unit". Every user-visible surface — landing
 * page, app header, PDF and Excel covers, facility sheets, deck footers,
 * import/export reports and help text — reads this constant, so the next
 * rename is one edit and `scripts/orgName.test.ts` fails the build if the
 * retired wording comes back.
 *
 * Role names ("State Admin") and stage names ("State Assessment") are NOT
 * organisation names and stay unchanged.
 */
export const ORG_NAME = "District Quality Assurance Unit";

/** Full identity line used on exports and document covers. */
export const ORG_SIGNATURE = `${ORG_NAME} · Quality Assurance`;

/** Wording retired by the rename. Matched case-insensitively by the CI test. */
export const RETIRED_ORG_NAMES = [
  "State Health Department",
  "State Health Dept",
  "State Health Department - Quality Assurance",
  "State Health Department · Quality Assurance",
] as const;
