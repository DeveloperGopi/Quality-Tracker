const PHONE_COUNTRY_CODE = "+91";
function phoneDigits(input) {
  return String(input ?? "").replace(/\D/g, "");
}
function nationalMobile(input) {
  let digits = phoneDigits(input);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  if (!/^[6-9]/.test(digits)) return null;
  return digits;
}
function normalizePhone(input) {
  const national = nationalMobile(input);
  return national ? `${PHONE_COUNTRY_CODE}${national}` : null;
}
function phoneError(input) {
  if (!String(input ?? "").trim()) return null;
  const national = nationalMobile(input);
  if (national) return null;
  return "Enter a 10-digit mobile number starting 6–9 (e.g. 98765 43210).";
}
function phoneDisplay(input) {
  const national = nationalMobile(input);
  if (!national) return String(input ?? "");
  return `${national.slice(0, 5)} ${national.slice(5)}`;
}
function maskPhone(input) {
  const national = nationalMobile(input);
  if (!national) return "";
  return `${PHONE_COUNTRY_CODE} ••••• ${national.slice(-4)}`;
}
function phoneForViewer(input, full) {
  if (!input) return "";
  return full ? `${PHONE_COUNTRY_CODE} ${phoneDisplay(input)}` : maskPhone(input);
}
function telHref(input) {
  const e164 = normalizePhone(input);
  return e164 ? `tel:${e164}` : null;
}

export { phoneError as a, maskPhone as m, normalizePhone as n, phoneForViewer as p, telHref as t };
