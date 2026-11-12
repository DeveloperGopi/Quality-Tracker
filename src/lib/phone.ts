/**
 * ASSESSOR CONTACT NUMBERS — one rule for every surface.
 *
 * Stored in E.164 (+91XXXXXXXXXX), entered as a 10-digit Indian mobile
 * (first digit 6–9). Viewers see the last four digits only; editors and
 * State Admins see the full number (Admin can relax this).
 */

export const PHONE_COUNTRY_CODE = "+91";

/** Digits only (strips +91, 0 prefix, spaces, dashes, brackets). */
export function phoneDigits(input: string | null | undefined): string {
  return String(input ?? "").replace(/\D/g, "");
}

/** The 10-digit national part, or null when the input is not a mobile. */
export function nationalMobile(input: string | null | undefined): string | null {
  let digits = phoneDigits(input);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  if (!/^[6-9]/.test(digits)) return null;
  return digits;
}

/** E.164 (+91XXXXXXXXXX) or null for an empty/invalid value. */
export function normalizePhone(input: string | null | undefined): string | null {
  const national = nationalMobile(input);
  return national ? `${PHONE_COUNTRY_CODE}${national}` : null;
}

/** Inline validation message (null = valid or empty). */
export function phoneError(input: string | null | undefined): string | null {
  if (!String(input ?? "").trim()) return null;
  const national = nationalMobile(input);
  if (national) return null;
  return "Enter a 10-digit mobile number starting 6–9 (e.g. 98765 43210).";
}

/** "98765 43210" for display next to the +91 prefix. */
export function phoneDisplay(input: string | null | undefined): string {
  const national = nationalMobile(input);
  if (!national) return String(input ?? "");
  return `${national.slice(0, 5)} ${national.slice(5)}`;
}

/** Viewers see the last four digits: "+91 ••••• 3210". */
export function maskPhone(input: string | null | undefined): string {
  const national = nationalMobile(input);
  if (!national) return "";
  return `${PHONE_COUNTRY_CODE} ••••• ${national.slice(-4)}`;
}

/** Mask unless the caller may see full numbers. */
export function phoneForViewer(
  input: string | null | undefined,
  full: boolean,
): string {
  if (!input) return "";
  return full ? `${PHONE_COUNTRY_CODE} ${phoneDisplay(input)}` : maskPhone(input);
}

export function telHref(input: string | null | undefined): string | null {
  const e164 = normalizePhone(input);
  return e164 ? `tel:${e164}` : null;
}
