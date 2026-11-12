/**
 * NOC AVAILABILITY — ONE vocabulary for a field that used to have three.
 *
 * Root cause of the old contradiction: `fireNocs.nocAvailable` is a stored
 * optional string ("Yes" | "No") with NO central option list. The master grid
 * declared the column `type: "status"`, so a blank value fell through
 * `blankLabel()` and painted the lifecycle word "Not started" — while
 * "Fire NOC Validity Status" was derived from the expiry date and could read
 * "Valid" beside it. Three vocabularies, one field.
 *
 * The rule now lives here (imported by the column config, the quick view, the
 * filters and the tests):
 *   1. a stored "Yes" / "No" wins — it is what the facility entered;
 *   2. a blank with any NOC record (number, issue date, expiry, document or
 *      link) is DERIVED as "Yes" — the record exists, only the flag is blank;
 *   3. no record at all is blank → the screen shows "-" (never "Not started");
 *   4. "No" stored beside an issue/expiry date is a CONFLICT: both surfaces
 *      still agree (deriveFireNocStatus turns "No" into Not Obtained) but the
 *      quick view flags it under Needs attention.
 */

export type NocAvailability = {
  /** The Yes/No the screen shows; empty string means "not recorded". */
  value: "Yes" | "No" | "";
  /** Where the value came from — reported in the UI and in tests. */
  source: "stored" | "derived" | "none";
  /** Stored "No" but the record carries a NOC date/document. */
  conflict: boolean;
  /** Plain-language conflict, ready for the Needs-attention list. */
  conflictText: string | null;
};

/* The NOC record shape is read loosely: the master row, the fireNocs Convex
   record and the profile's NOC slot all spell the attachment slightly
   differently (nocAttachmentId vs attachmentId). */
export function deriveNocAvailability(row: {
  noc?: Record<string, unknown> | null;
} | null | undefined): NocAvailability {
  const noc = (row?.noc ?? null) as Record<string, unknown> | null;
  const str = (k: string) => {
    const v = noc?.[k];
    return typeof v === "string" ? v.trim() : "";
  };
  const storedRaw = str("nocAvailable").toLowerCase();
  const stored = storedRaw === "yes" ? "Yes" : storedRaw === "no" ? "No" : "";
  const hasRecord = !!(
    str("nocNumber") ||
    str("issuedDate") ||
    str("expiryDate") ||
    str("attachmentId") ||
    str("nocAttachmentId") ||
    str("nocLink")
  );
  if (stored) {
    const conflict = stored === "No" && hasRecord;
    return {
      value: stored,
      source: "stored",
      conflict,
      conflictText: conflict
        ? `NOC Available is "No" but a NOC number, date or document is recorded — reconcile the two.`
        : null,
    };
  }
  if (hasRecord) return { value: "Yes", source: "derived", conflict: false, conflictText: null };
  return { value: "", source: "none", conflict: false, conflictText: null };
}
