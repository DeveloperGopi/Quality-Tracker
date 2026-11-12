const DATE_INPUT_ERROR = "Enter a date like 06-Nov-2025";
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
const MONTH_FULL = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
];
const MONTH_LOOKUP = (() => {
  const out = {};
  MONTH_ABBR.forEach((name, i) => {
    out[name.toLowerCase()] = i + 1;
  });
  MONTH_FULL.forEach((name, i) => {
    out[name] = i + 1;
    out[name.slice(0, 3)] = i + 1;
  });
  out.sept = 9;
  return out;
})();
const pad2 = (n) => String(n).padStart(2, "0");
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
function makeIso(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (year < 1e3 || year > 9999 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}
function parseDateText(raw) {
  const text = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!text) return null;
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return makeIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const numeric = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (numeric) {
    const yearRaw = Number(numeric[3]);
    const year = numeric[3].length === 2 ? yearRaw < 70 ? 2e3 + yearRaw : 1900 + yearRaw : yearRaw;
    return makeIso(year, Number(numeric[2]), Number(numeric[1]));
  }
  const named = text.match(/^(\d{1,2})[-/\s]([A-Za-z]{3,9})[-/\s](\d{2}|\d{4})$/);
  if (named) {
    const month = MONTH_LOOKUP[named[2].toLowerCase()];
    if (!month) return null;
    const yearRaw = Number(named[3]);
    const year = named[3].length === 2 ? yearRaw < 70 ? 2e3 + yearRaw : 1900 + yearRaw : yearRaw;
    return makeIso(year, month, Number(named[1]));
  }
  return null;
}
function isIsoDate(value) {
  const v = (value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return parseDateText(v) === v;
}
function formatDateLong(iso) {
  if (!isIsoDate(iso)) return "";
  const [year, month, day] = iso.split("-").map(Number);
  return `${pad2(day)}-${MONTH_ABBR[month - 1]}-${year}`;
}
function formatDateSpoken(iso) {
  if (!isIsoDate(iso)) return "";
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTH_FULL[month - 1]} ${year}`;
}
function monthName(month) {
  return MONTH_ABBR[month - 1] ?? "";
}
function addDays(iso, days) {
  if (!isIsoDate(iso)) return "";
  const [year, month, day] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
function shiftMonth(year, month, delta) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}
function daysBetweenIso(a, b) {
  if (!isIsoDate(a) || !isIsoDate(b)) return null;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
}
function monthGrid(year, month) {
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const total = daysInMonth(year, month);
  const cells = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= total; day += 1) {
    cells.push(`${year}-${pad2(month)}-${pad2(day)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function dateRuleError(iso, { min, max }) {
  if (!isIsoDate(iso)) return DATE_INPUT_ERROR;
  if (min && iso < min) {
    return `Before the earliest allowed date (${formatDateLong(min)}) — pick ${formatDateLong(min)} or later`;
  }
  if (max && iso > max) {
    return `After the latest allowed date (${formatDateLong(max)}) — pick ${formatDateLong(max)} or earlier`;
  }
  return null;
}
function todayIsoIST(now = /* @__PURE__ */ new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1e3);
  return `${ist.getUTCFullYear()}-${pad2(ist.getUTCMonth() + 1)}-${pad2(ist.getUTCDate())}`;
}
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export { DATE_INPUT_ERROR as D, WEEKDAY_LABELS as W, addDays as a, dateRuleError as b, monthName as c, daysBetweenIso as d, formatDateSpoken as e, formatDateLong as f, isIsoDate as i, monthGrid as m, parseDateText as p, shiftMonth as s, todayIsoIST as t };
