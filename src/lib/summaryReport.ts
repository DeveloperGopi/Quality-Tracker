/** Shared adapter: report rows → deck rows for the NQAS Summary Report page.
 *  Every number on the Summary Report page comes from `buildDeckData` (the
 *  same aggregation the PPT/PDF deck uses), so the page can never disagree
 *  with the exported deck. The file exposes a SECOND pure function,
 *  `computeDataChecks`, for the page's "Data checks" panel. */

import { buildDeckData, type DeckRow } from "./deck";

export type SummaryChecks = {
  noNaEntry: { facility: string; block: string }[];
  noIaScores: number;
  missingCertDate: number;
  certStatusNoDate: number;
  certDateNoStatus: number;
  noSaEntryFacilities: { facility: string; block: string }[];
};

export function computeDataChecks(rows: DeckRow[]): SummaryChecks {
  const noNaEntryList: { facility: string; block: string }[] = [];
  let noIaScores = 0;
  let missingCertDate = 0;
  let certStatusNoDate = 0;
  let certDateNoStatus = 0;
  for (const r of rows) {
    if (r.naStatus == null) noNaEntryList.push({ facility: r.facility, block: r.block });
    if (r.nqasIaQ1 == null && r.nqasIaQ2 == null) noIaScores += 1;
    if (!r.certDate) missingCertDate += 1;
    if (r.certStatus && !r.certDate) certStatusNoDate += 1;
    if (!r.certStatus && r.certDate) certDateNoStatus += 1;
  }
  return {
    noNaEntry: noNaEntryList,
    noIaScores,
    missingCertDate,
    certStatusNoDate,
    certDateNoStatus,
    noSaEntryFacilities: rows
      .filter((r) => r.saStatus == null)
      .map((r) => ({ facility: r.facility, block: r.block })),
  };
}

export { buildDeckData };
