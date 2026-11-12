/** The result reader is permanently disabled in this build: its OCR and PDF
 *  packages were removed in Phase 0. Kept as a hook so existing call sites
 *  have one stable, false source of truth. */
export function useResultReaderEnabled(): boolean {
  return false;
}
