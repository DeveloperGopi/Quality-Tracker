/** One shared rule for the NQAS result reader. Default is OFF. */

export const RESULT_READER_SETTING_KEY = "resultReaderEnabled";

export function isResultReaderEnabled(settings: Record<string, unknown> | null | undefined): boolean {
  return settings?.[RESULT_READER_SETTING_KEY] === true;
}
