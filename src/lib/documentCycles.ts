/** Which documents belong to a certification cycle, and which belong to the
 *  facility itself. The database keeps one cycle number on every row; this is
 *  the display/upload rule only. */

export const FACILITY_DOC_KEYS = new Set(["Condemned", "NOC"]);

export function isFacilityDocument(docKey: string): boolean {
  return FACILITY_DOC_KEYS.has(docKey);
}

/** The cycle a newly chosen file is filed under. Facility documents keep the
 *  current cycle in storage but display "-". */
export function uploadCycleFor(docKey: string, cycleNo: number | null | undefined): number {
  return Math.max(1, Number(cycleNo) || 1);
}

export function cycleLabel(docKey: string, cycleNo: number | null | undefined): string {
  return isFacilityDocument(docKey) ? "-" : String(cycleNo ?? "-");
}
