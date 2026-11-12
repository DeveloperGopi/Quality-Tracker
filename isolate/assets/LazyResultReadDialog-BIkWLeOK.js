const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-ocr-UhGfDNNW.js","assets/icons-BxQpodNr.js","assets/vendor-exceljs-CqnmHTS6.js"])))=>i.map(i=>d[i]);
import { j as jsxRuntimeExports } from './vendor-motion-DgC1stbS.js';
import { r as reactExports, b2 as ScanText, L as LoaderCircle, T as TriangleAlert, w as RotateCcw, m as Check, c7 as FileSearch, S as ShieldCheck } from './icons-BxQpodNr.js';
import { c as cn, l as useQuery, j as api, m as useMutation, B as Button, t as toast } from './index-CBV6wOh8.js';
import { C as Checkbox } from './checkbox-CjOYMc2v.js';
import { D as Dialog, a as DialogContent, b as DialogHeader, c as DialogTitle, d as DialogDescription, e as DialogFooter } from './dialog-BW3GEiPg.js';
import { I as Input } from './input-Cy2oZLur.js';
import { bO as createContextScope } from './AppShell-CP099uvN.js';
import { P as Primitive } from './label-BaPkqXdo.js';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from './select-qTILnHQg.js';
import { n as useDocumentUrl, P as PdfCanvasViewer } from './PdfCanvasViewer-C0MZuH_2.js';
import { _ as __vitePreload } from './vendor-jspdf-BarNdCns.js';

var PROGRESS_NAME = "Progress";
var DEFAULT_MAX = 100;
var [createProgressContext] = createContextScope(PROGRESS_NAME);
var [ProgressProvider, useProgressContext] = createProgressContext(PROGRESS_NAME);
var Progress$1 = reactExports.forwardRef(
  (props, forwardedRef) => {
    const {
      __scopeProgress,
      value: valueProp = null,
      max: maxProp,
      getValueLabel = defaultGetValueLabel,
      ...progressProps
    } = props;
    if ((maxProp || maxProp === 0) && !isValidMaxNumber(maxProp)) {
      console.error(getInvalidMaxError(`${maxProp}`, "Progress"));
    }
    const max = isValidMaxNumber(maxProp) ? maxProp : DEFAULT_MAX;
    if (valueProp !== null && !isValidValueNumber(valueProp, max)) {
      console.error(getInvalidValueError(`${valueProp}`, "Progress"));
    }
    const value = isValidValueNumber(valueProp, max) ? valueProp : null;
    const valueLabel = isNumber(value) ? getValueLabel(value, max) : void 0;
    return /* @__PURE__ */ jsxRuntimeExports.jsx(ProgressProvider, { scope: __scopeProgress, value, max, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.div,
      {
        "aria-valuemax": max,
        "aria-valuemin": 0,
        "aria-valuenow": isNumber(value) ? value : void 0,
        "aria-valuetext": valueLabel,
        role: "progressbar",
        "data-state": getProgressState(value, max),
        "data-value": value ?? void 0,
        "data-max": max,
        ...progressProps,
        ref: forwardedRef
      }
    ) });
  }
);
Progress$1.displayName = PROGRESS_NAME;
var INDICATOR_NAME = "ProgressIndicator";
var ProgressIndicator = reactExports.forwardRef(
  (props, forwardedRef) => {
    const { __scopeProgress, ...indicatorProps } = props;
    const context = useProgressContext(INDICATOR_NAME, __scopeProgress);
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      Primitive.div,
      {
        "data-state": getProgressState(context.value, context.max),
        "data-value": context.value ?? void 0,
        "data-max": context.max,
        ...indicatorProps,
        ref: forwardedRef
      }
    );
  }
);
ProgressIndicator.displayName = INDICATOR_NAME;
function defaultGetValueLabel(value, max) {
  return `${Math.round(value / max * 100)}%`;
}
function getProgressState(value, maxValue) {
  return value == null ? "indeterminate" : value === maxValue ? "complete" : "loading";
}
function isNumber(value) {
  return typeof value === "number";
}
function isValidMaxNumber(max) {
  return isNumber(max) && !isNaN(max) && max > 0;
}
function isValidValueNumber(value, max) {
  return isNumber(value) && !isNaN(value) && value <= max && value >= 0;
}
function getInvalidMaxError(propValue, componentName) {
  return `Invalid prop \`max\` of value \`${propValue}\` supplied to \`${componentName}\`. Only numbers greater than 0 are valid max values. Defaulting to \`${DEFAULT_MAX}\`.`;
}
function getInvalidValueError(propValue, componentName) {
  return `Invalid prop \`value\` of value \`${propValue}\` supplied to \`${componentName}\`. The \`value\` prop must be:
  - a positive number
  - less than the value passed to \`max\` (or ${DEFAULT_MAX} if no \`max\` prop is set)
  - \`null\` or \`undefined\` if the progress is indeterminate.

Defaulting to \`null\`.`;
}
var Root = Progress$1;
var Indicator = ProgressIndicator;

function Progress({
  className,
  value,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Root,
    {
      "data-slot": "progress",
      className: cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      ),
      ...props,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Indicator,
        {
          "data-slot": "progress-indicator",
          className: "bg-primary h-full w-full flex-1 transition-all",
          style: { transform: `translateX(-${100 - (value || 0)}%)` }
        }
      )
    }
  );
}

const MONTHS = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12
};
function iso(year, month, day) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
const RESULT_STATUS = /(Quality\s+Certified|Certified\s+with\s+Conditionality|Conditionally\s+Certified|Deferred|Not\s+Certified|Result\s+Declared)/i;
function resultNameKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function parseOneDate(text) {
  return findDateRange(text)?.start ?? null;
}
function parseTargetResultLetter(pages, target = {}) {
  const wanted = target.name ? resultNameKey(target.name) : "";
  const rows = [];
  for (const page of pages) {
    const lines = page.text.split(/\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
    const letterDate = parseOneDate(page.topRightText ?? "") ?? parseOneDate(lines.find((line) => /date\s*(?:of\s*letter)?\s*[:-]/i.test(line)) ?? "");
    for (const line of lines) {
      const dates = findDateRange(line);
      const percentages = [...line.matchAll(/(\d{1,3}(?:\.\d{1,2})?)\s*%/g)];
      if (!dates || percentages.length === 0) continue;
      const lineKey = resultNameKey(line);
      if (wanted && !lineKey.includes(wanted)) continue;
      const status = line.match(RESULT_STATUS)?.[1]?.replace(/\s+/g, " ") ?? null;
      if (!status && !/service\s+packages?|criteria/i.test(line)) continue;
      const mode = line.match(/\b(Physical|Virtual|Hybrid|Tele(?:-?health)?)\b/i)?.[1] ?? null;
      const beforeDate = line.slice(
        0,
        line.search(
          /\d{1,2}[\s-][A-Za-z]{3,9}\.?[\s-]\d{2,4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{1,2}[./-]\d{1,2}/
        )
      );
      const nameParts = beforeDate.replace(/^\s*\d+[.)]?\s*/, "").split(",").map((part) => part.trim()).filter(Boolean);
      const facilityNameRaw = nameParts[0] ?? target.name ?? "Facility";
      const district = nameParts[1] ?? null;
      const state = nameParts.slice(2).join(", ") || null;
      const packageCount = Number(line.match(/(\d{1,2})\s+Service\s+Packages?/i)?.[1]) || null;
      const criteria = line.match(/Met\s+(\d+)\s+out\s+of\s+(\d+)\s+Criteria/i);
      const overallScore = Number(percentages[0]?.[1]);
      const warnings = [];
      if (!Number.isFinite(overallScore)) warnings.push("Overall score was not readable.");
      if (!letterDate) warnings.push("Letter date was not readable.");
      rows.push({
        facilityNameRaw,
        district,
        state,
        title: line,
        pageNumber: page.pageNumber,
        letterDate,
        assessmentStartDate: dates.start,
        assessmentEndDate: dates.end,
        certificationStatus: status,
        mode,
        packageCount,
        criteriaMet: criteria ? Number(criteria[1]) : null,
        criteriaTotal: criteria ? Number(criteria[2]) : null,
        overallScore: Number.isFinite(overallScore) ? overallScore : null,
        letterScore: Number.isFinite(overallScore) ? overallScore : null,
        pssScore: null,
        areas: [],
        departments: [],
        departmentsKind: "package",
        warnings
      });
    }
  }
  const seen = /* @__PURE__ */ new Set();
  return rows.filter((row) => {
    const key = `${resultNameKey(row.facilityNameRaw)}|${row.assessmentStartDate}|${row.overallScore}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function findDateRange(text) {
  const found = [];
  const numeric = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/g;
  const named = /\b(\d{1,2})[\s-]([A-Za-z]{3,9})\.?[\s-](\d{2,4})\b/g;
  const yearFirst = /\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/g;
  for (const match of text.matchAll(numeric)) {
    const value = iso(Number(match[3]), Number(match[2]), Number(match[1]));
    if (value) found.push(value);
  }
  for (const match of text.matchAll(named)) {
    const month = MONTHS[match[2].slice(0, 3).toLowerCase()] ?? 0;
    const value = iso(Number(match[3]), month, Number(match[1]));
    if (value) found.push(value);
  }
  for (const match of text.matchAll(yearFirst)) {
    const value = iso(Number(match[1]), Number(match[2]), Number(match[3]));
    if (value) found.push(value);
  }
  if (found.length === 0) return null;
  return { start: found[0], end: found[1] ?? found[0] };
}

const AREA_KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const ANNEXURE_HEADING = /Summary\s+(?:of\s+)?External\s+Assessment\s+Report(?:\s*\(?\s*Annexure\s*[-–]?\s*(?:I|1|[A-H])\s*\)?)?/gi;
const NUMBER = /(\d{1,3}(?:\.\d{1,2})?)/;
const SCORE_ONLY = /^\s*(\d{1,3}(?:\.\d{1,2})?)\s*%?\s*$/;
const STOP_WORDS = /* @__PURE__ */ new Set([
  "aam",
  "aam-phc",
  "aam phc",
  "aam-shc",
  "aam shc",
  "aam-uphc",
  "aam uphc",
  "phc",
  "chc",
  "uphc",
  "uhwc",
  "hwc",
  "hsc",
  "sdh",
  "dh",
  "ugphc",
  "uamm",
  "uphc-hsc",
  "hwc-hsc",
  "phc-hsc",
  "phc hsc"
]);
function cleanLine(line) {
  return line.replace(/\s+/g, " ").trim();
}
function firstNumber(text) {
  const match = text.match(NUMBER);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}
function lastNumber(text) {
  const matches = [...text.matchAll(/\d{1,3}(?:\.\d{1,2})?/g)];
  if (matches.length === 0) return null;
  const value = Number(matches[matches.length - 1][0]);
  return Number.isFinite(value) ? value : null;
}
function scoreNear(lines, start, label) {
  for (let i = start; i < lines.length; i += 1) {
    if (!label.test(lines[i])) continue;
    const same = lines[i].replace(label, " ");
    const direct = firstNumber(same);
    if (direct != null) return { value: direct, index: i };
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j += 1) {
      const next = lines[j];
      if (!next) continue;
      const only = next.match(SCORE_ONLY)?.[1];
      if (only != null) {
        const value = Number(only);
        return { value: Number.isFinite(value) ? value : null, index: i };
      }
      const embedded = firstNumber(next);
      if (embedded != null) return { value: embedded, index: i };
      if (/[a-z]{3,}/i.test(next)) break;
    }
    return { value: null, index: i };
  }
  return { value: null, index: -1 };
}
function splitTitle(text) {
  const lines = text.split(/\n/).map(cleanLine).filter(Boolean).filter(
    (line) => !/^Summary\s+of\s+External/i.test(line) && !/^Annexure\s*[-–]?\s*I/i.test(line) && !/^(NQAS|National Quality Assurance Standards|External Assessment Report)$/i.test(line)
  );
  const labelledFacility = text.match(
    /(?:Facility\s*Name|Name\s*of\s*(?:the\s*)?Facility|Institution)\s*[:\-]\s*([^\n]+)/i
  )?.[1];
  const labelledDistrict = text.match(
    /District\s*[:\-]\s*([^\n,]+)/i
  )?.[1];
  const labelledState = text.match(/State\s*[:\-]\s*([^\n,]+)/i)?.[1];
  const commaLine = lines.find(
    (line) => line.includes(",") && !/score|department|area|patient|standard|indicator|marks|total/i.test(line) && line.split(",").filter(Boolean).length >= 1
  );
  const raw = (labelledFacility ?? commaLine ?? "").trim();
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  let facilityNameRaw = parts[0] ?? raw;
  let district = labelledDistrict?.trim() ?? parts[1] ?? null;
  let state = labelledState?.trim() ?? parts[2] ?? null;
  if (!facilityNameRaw) {
    facilityNameRaw = lines.find((line) => /[a-z]/i.test(line)) ?? "Unknown facility";
  }
  if (!district) {
    const dash = facilityNameRaw.match(/^(.*?)\s+[-–]\s+(.+)$/);
    if (dash && /district|block|tirup|vellore|krishnagiri|dharmapuri/i.test(dash[2])) {
      facilityNameRaw = dash[1].trim();
      district = dash[2].trim();
    }
  }
  if (!district) {
    const spaced = facilityNameRaw.match(
      /^(.*?)\s+(Tirupathur|Tirupattur|Thirupathur|Thirupattur|Vellore|Ranipet|Tiruvannamalai|Krishnagiri|Dharmapuri|Salem)(?:\s*,?\s*(Tamil\s*Nadu|TN))?$/i
    );
    if (spaced) {
      facilityNameRaw = spaced[1].trim();
      district = spaced[2].trim();
      state = state ?? spaced[3]?.trim() ?? null;
    }
  }
  if (state && /^(Tamil\s*Nadu|TN)$/i.test(state) === false && parts.length <= 2) ;
  return {
    facilityNameRaw: cleanLine(facilityNameRaw),
    district: district ? cleanLine(district) : null,
    state: state ? cleanLine(state) : null,
    title: raw || facilityNameRaw
  };
}
function headingIndex(lines, expression, from = 0) {
  for (let i = from; i < lines.length; i += 1) {
    if (expression.test(lines[i])) return i;
  }
  return -1;
}
function parseAreaSection(lines, start, end) {
  const out = /* @__PURE__ */ new Map();
  let pendingKey = null;
  let pendingName = "";
  const add = (key, name, score) => {
    const previous = out.get(key);
    if (!previous || previous.score == null) {
      out.set(key, { name: name || previous?.name || key, score });
    }
  };
  for (let i = start; i < end; i += 1) {
    const line = lines[i];
    if (!line) continue;
    if (/^(area\s+of\s+concern|s\.?\s*no|score|sl\.?\s*no)/i.test(line)) continue;
    const keyed = line.match(
      /^\s*(?:\d{1,3}[.)]?\s*)?\(?([A-Ha-h])\)?[\s.\-:)]+(.*)$/
    );
    const alone = line.match(/^\s*(?:\d{1,3}[.)]?\s*)?\(?([A-Ha-h])\)?\s*$/);
    if (keyed) {
      const key = keyed[1].toUpperCase();
      if (!AREA_KEYS.includes(key)) continue;
      const rest = keyed[2].trim();
      pendingName = "";
      let score = lastNumber(rest);
      let name = rest.replace(/\d{1,3}(?:\.\d{1,2})?/g, " ").replace(/[|:;]+/g, " ").trim();
      if (score == null) {
        for (let j = i + 1; j < Math.min(end, i + 4); j += 1) {
          const next = lines[j];
          if (!next) continue;
          if (/^\s*\(?([A-Ha-h])\)?[\s.\-:)]+/.test(next)) break;
          score = lastNumber(next);
          if (score != null) {
            if (!name && /[a-z]/i.test(next)) {
              name = next.replace(/\d{1,3}(?:\.\d{1,2})?/g, " ").trim();
            }
            break;
          }
        }
      }
      if (score != null) add(key, name, score);
      else {
        pendingKey = key;
        pendingName = name;
      }
      continue;
    }
    if (alone) {
      pendingKey = alone[1].toUpperCase();
      pendingName = "";
      continue;
    }
    if (pendingKey) {
      const score = lastNumber(line);
      if (score != null) {
        const name = line.replace(/\d{1,3}(?:\.\d{1,2})?/g, " ").replace(/[|:;]+/g, " ").trim();
        add(pendingKey, name || pendingName, score);
        pendingKey = null;
        pendingName = "";
      } else if (!pendingName && /[a-z]/i.test(line)) {
        pendingName = line.replace(/[|:;]+/g, " ").trim();
      }
    }
  }
  return out;
}
function parseDepartmentSection(lines, start, end, aliases) {
  const out = [];
  let pendingName = "";
  const seen = /* @__PURE__ */ new Set();
  const aliasMap = new Map(
    aliases.map((a) => [normalizeDepartment(a.pdfName), a.canonicalName.trim()])
  );
  const push = (rawName, score) => {
    const name = cleanLine(
      rawName.replace(/^\s*(?:s\.?\s*no|sl\.?\s*no|department(?:al)?\s*(?:name)?)\s*[.:\-]?\s*/i, "").replace(/\d{1,3}(?:\.\d{1,2})?/g, " ").replace(/[|:;]+/g, " ")
    );
    if (!name || name.length < 2) return;
    if (/^(total|overall|department|departments|score|name)$/i.test(name)) return;
    const key = normalizeDepartment(name);
    if (seen.has(key)) return;
    seen.add(key);
    const canonical = aliasMap.get(key);
    out.push({
      name,
      canonicalName: canonical ?? name,
      score,
      isNew: !canonical
    });
  };
  for (let i = start; i < end; i += 1) {
    const line = lines[i];
    if (!line) continue;
    if (/^(department(?:al)?\s*(?:name|score)?|s\.?\s*no|sl\.?\s*no|score|name)$/i.test(line) || /^departments?\s*[:\-]?\s*\d+$/i.test(line) || /^no\.?\s*of\s*departments?/i.test(line) || /^certification\s+criteria$/i.test(line) || /^\d{1,2}[.)]?\s+criteria\s+(?:met|not\s+met)$/i.test(line)) {
      continue;
    }
    const numbers = [...line.matchAll(/\d{1,3}(?:\.\d{1,2})?/g)];
    if (numbers.length === 0) {
      const possible = cleanLine(line.replace(/[|:;]+/g, " "));
      if (/[a-z]/i.test(possible) && possible.length <= 80) pendingName = possible;
      continue;
    }
    if (numbers.length === 1 && /^\s*\d{1,2}[.)]?\s+[a-z]/i.test(line) && !/^\s*\d{1,2}[.)]?\s+\d+\s*$/.test(line)) {
      let nextScore = null;
      for (let j = i + 1; j < Math.min(end, i + 4); j += 1) {
        if (!lines[j]) continue;
        nextScore = lines[j].match(SCORE_ONLY)?.[1] ?? null;
        break;
      }
      if (nextScore != null) {
        pendingName = cleanLine(
          line.replace(/^\s*\d{1,2}[.)]?\s*/, "").replace(/[|:;]+/g, " ")
        );
        continue;
      }
    }
    const score = lastNumber(line);
    if (score == null) continue;
    const name = cleanLine(
      line.replace(/\d{1,3}(?:\.\d{1,2})?/g, " ").replace(/^\s*(?:s\.?\s*no|sl\.?\s*no)[.:\-]?\s*/i, "").replace(/[|:;]+/g, " ")
    );
    push(name || pendingName, score);
    pendingName = "";
  }
  return out;
}
function departmentCountLetter(text) {
  const match = text.match(/\b(\d{1,2})\s+Departments?\b/i) ?? text.match(/No\.?\s*of\s*Departments?\s*[:\-]?\s*(\d{1,2})/i);
  return match ? Number(match[1]) : null;
}
function normalizeDepartment(value) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}
function hasFacilityTitle(text) {
  if (/(?:Facility\s*Name|Name\s*of\s*(?:the\s*)?Facility|Institution)\s*[:\-]/i.test(text)) {
    return true;
  }
  return text.split(/\n/).map(cleanLine).filter(Boolean).some(
    (line) => !/\d/.test(line) && !/score|department|area|patient|standard|indicator|marks|total/i.test(line) && (/\b(?:Tirupathur|Tirupattur|Thirupathur|Thirupattur|Vellore|Ranipet|Tiruvannamalai|Krishnagiri|Dharmapuri|Salem|Tamil\s*Nadu|TN)\b/i.test(
      line
    ) || /^\s*(?:aam|phc|chc|uphc|uhwc|hwc|hsc|sdh|dh|ugphc|uamm)\b/i.test(line))
  );
}
function parseAnnexureText(text, options = {}) {
  const aliases = options.departmentNames ?? [];
  const matches = [...text.matchAll(ANNEXURE_HEADING)];
  if (matches.length === 0) return [];
  const groups = [];
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const start = match.index ?? 0;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? text.length : text.length;
    const chunk = text.slice(start, end);
    const before = text.slice(0, start);
    const pageNumber = (before.match(/\f/g)?.length ?? 0) + 1;
    const previous = groups[groups.length - 1];
    const titled = hasFacilityTitle(chunk);
    const previousTitle = previous ? splitTitle(previous.sectionText) : null;
    const chunkTitle = titled ? splitTitle(chunk) : null;
    const sameTitle = !!previousTitle && !!chunkTitle && normalizeFacilityName(previousTitle.facilityNameRaw) === normalizeFacilityName(chunkTitle.facilityNameRaw) && normalizeDepartment(previousTitle.district ?? "") === normalizeDepartment(chunkTitle.district ?? "");
    if (previous && (!titled || sameTitle)) {
      previous.sectionText += `
${chunk}`;
    } else {
      groups.push({ sectionText: chunk, pageNumber });
    }
  }
  const sections = [];
  for (const group of groups) {
    const sectionText = group.sectionText;
    const pageNumber = group.pageNumber;
    const title = splitTitle(sectionText);
    const core = sectionText.split(/Score\s+against\s+each\s+Standard|Proportionate\s+score/i)[0];
    const lines = core.split(/\n/).map(cleanLine).filter(Boolean);
    const overall = scoreNear(
      lines,
      0,
      /Overall\s*(?:NQAS\s*)?Score|Total\s*Score/i
    ).value;
    const PSS_LABEL = /Patient\s*Satisfaction\s*(?:\(\s*PSS\s*\)|Score)|PSS\s*(?:Score)?/i;
    let pss = scoreNear(lines, 0, PSS_LABEL).value;
    if (pss == null) {
      const bare = headingIndex(lines, /^Patient\s*Satisfaction\s*$/i);
      if (bare >= 0) {
        for (let i = bare + 1; i < Math.min(lines.length, bare + 3); i += 1) {
          const value = lines[i].match(SCORE_ONLY)?.[1];
          if (value != null) {
            const parsedValue = Number(value);
            pss = Number.isFinite(parsedValue) ? parsedValue : null;
            break;
          }
        }
      }
    }
    const letter = scoreNear(
      lines,
      0,
      /(?:NQAS|Letter|Final|Certification)\s*Score|Score\s*(?:as\s*per)?\s*Letter/i
    ).value;
    const areaHeading = headingIndex(
      lines,
      /Area\s*of\s*Concern(?:\s*wise)?\s*Score|Area\s*of\s*Concern/i
    );
    const patientHeading = headingIndex(
      lines,
      /Patient\s*Satisfaction\s*(?:\(\s*PSS\s*\)|Score)|PSS\s*(?:Score)?/i
    );
    const deptHeading = headingIndex(
      lines,
      /Departmental\s*Score|Department\s*wise\s*Score|Department\s*Score|Theme\s*wise\s*Score|Theme\s*Score/i
    );
    const departmentsKind = deptHeading >= 0 && /theme/i.test(lines[deptHeading]) ? "package" : "department";
    const standardHeading = headingIndex(lines, /Score\s*against\s*each\s*Standard/i);
    const criteriaHeading = headingIndex(lines, /Certification\s*Criteria/i);
    const candidateEnds = [
      areaHeading,
      patientHeading,
      deptHeading,
      criteriaHeading,
      standardHeading,
      lines.length
    ].filter((n) => n >= 0);
    const nextEnd = (from) => candidateEnds.filter((n) => n > from).sort((a, b) => a - b)[0] ?? lines.length;
    const areaStart = areaHeading >= 0 ? areaHeading + 1 : -1;
    const areaEnd = areaStart >= 0 ? nextEnd(areaHeading) : -1;
    let areaMap = areaStart >= 0 ? parseAreaSection(lines, areaStart, areaEnd) : /* @__PURE__ */ new Map();
    if (areaMap.size === 0) {
      const fallbackStart = Math.max(
        0,
        lines.findIndex((l) => /Overall\s*(?:NQAS\s*)?Score/i.test(l)) + 1
      );
      areaMap = parseAreaSection(lines, fallbackStart, lines.length);
    }
    const deptStart = deptHeading >= 0 ? deptHeading + 1 : -1;
    const deptEnd = deptStart >= 0 ? nextEnd(deptHeading) : -1;
    let departments = deptStart >= 0 ? parseDepartmentSection(lines, deptStart, deptEnd, aliases) : [];
    if (departments.length === 0 && deptHeading < 0) {
      const inferred = headingIndex(lines, /Department(?:s)?\b/i);
      if (inferred >= 0) {
        departments = parseDepartmentSection(lines, inferred + 1, nextEnd(inferred), aliases);
      }
    }
    const areas = AREA_KEYS.flatMap((key) => {
      const row = areaMap.get(key);
      return row ? [{ key, name: row.name || key, score: row.score }] : [];
    });
    const warnings = [];
    if (areas.length !== 8) {
      warnings.push(`Only ${areas.length} of 8 areas found.`);
    }
    const declaredDepartments = departmentCountLetter(core);
    if (declaredDepartments != null && departments.length !== declaredDepartments) {
      warnings.push(
        `The letter says ${declaredDepartments} departments; ${departments.length} department scores were read.`
      );
    }
    for (const [label, value] of [
      ["Overall Score", overall],
      ["Patient Satisfaction (PSS)", pss],
      ["Letter score", letter]
    ]) {
      if (value != null && (value < 0 || value > 100)) {
        warnings.push(`${label} is outside 0–100.`);
      }
    }
    for (const area of areas) {
      if (area.score < 0 || area.score > 100) warnings.push(`Area ${area.key} is outside 0–100.`);
    }
    for (const dept of departments) {
      if (dept.score < 0 || dept.score > 100) warnings.push(`${dept.name} is outside 0–100.`);
    }
    if (letter != null && overall != null && Math.abs(letter - overall) >= 0.05) {
      warnings.push(
        `Annexure overall is ${overall.toFixed(2)}; the letter score is ${letter.toFixed(2)}.`
      );
    }
    if (overall == null) warnings.push("Overall Score was not found.");
    if (pss == null) warnings.push("Patient Satisfaction (PSS) score was not found.");
    if (departments.length === 0) warnings.push("No department scores were found.");
    const assessmentDate = findDateRange(sectionText.slice(0, 1600))?.start ?? null;
    const criteriaAt = sectionText.search(/Certification\s*Criteria/i);
    const criteriaSection = criteriaAt >= 0 ? sectionText.slice(criteriaAt) : "";
    const criteriaRows = criteriaSection.split(/\n/).map((line) => cleanLine(line)).filter((line) => /^\d{1,3}[.)]?\s+/.test(line)).filter((line) => /\b(?:met|not\s*met)\b/i.test(line));
    const criteriaMet = criteriaRows.filter(
      (line) => !/not\s*met/i.test(line)
    ).length;
    const criteriaTotal = criteriaRows.length;
    sections.push({
      facilityNameRaw: title.facilityNameRaw,
      district: title.district,
      state: title.state,
      title: title.title,
      pageNumber,
      assessmentDate,
      letterScore: letter,
      overallScore: overall,
      pssScore: pss,
      areas,
      departments,
      departmentsKind,
      criteriaMet: criteriaTotal > 0 ? criteriaMet : null,
      criteriaTotal: criteriaTotal > 0 ? criteriaTotal : null,
      warnings
    });
  }
  return sections;
}
function stripTypePrefix(value) {
  let out = value;
  let changed = true;
  while (changed) {
    changed = false;
    const match = out.match(/^([a-z][a-z0-9]*(?:\s*[-–]\s*[a-z][a-z0-9]*)?)\s*[-–:]\s*/i);
    if (match) {
      const prefix = normalizeDepartment(match[1]);
      if (STOP_WORDS.has(prefix)) {
        out = out.slice(match[0].length);
        changed = true;
        continue;
      }
    }
    const words = out.split(/\s+/);
    if (words.length > 1 && STOP_WORDS.has(normalizeDepartment(words[0]))) {
      out = words.slice(1).join(" ");
      changed = true;
    }
  }
  return out.trim();
}
function normalizeFacilityName(value) {
  return normalizeDepartment(
    stripTypePrefix(value).replace(/\([^)]*\)/g, " ").replace(
      /\b(?:tirupathur|tirupattur|thirupathur|thirupattur|vellore|ranipet|tiruvannamalai|krishnagiri|dharmapuri|salem|tamil\s*nadu|tn)\b/gi,
      " "
    )
  );
}
function printedFacilityType(value) {
  const type = value.toUpperCase();
  if (/AAM\s*[-–]?\s*UPHC/.test(type)) return "UPHC";
  if (/AAM\s*[-–]?\s*PHC/.test(type)) return "PHC";
  if (/AAM\s*[-–]?\s*SHC/.test(type)) return "HSC";
  if (/\bUPHC\b/.test(type)) return "UPHC";
  if (/\bCHC\b/.test(type)) return "CHC";
  if (/\bPHC\b/.test(type)) return "PHC";
  if (/\bHSC\b/.test(type)) return "HSC";
  return null;
}
function sameDistrict(parsed, facility) {
  const district = normalizeDepartment(parsed.district ?? "");
  if (!district) return true;
  const block = normalizeDepartment(facility.block);
  if (district === block) return true;
  return ["tirupathur", "tirupattur", "thirupathur", "thirupattur"].includes(district);
}
function matchAnnexureFacility(parsed, facilities, options = {}) {
  const wanted = normalizeFacilityName(parsed.facilityNameRaw);
  const districtFilter = normalizeDepartment(options.district ?? "");
  const blockFilter = districtFilter && !["tirupathur", "tirupattur", "thirupathur", "thirupattur"].includes(districtFilter) ? districtFilter : "";
  const candidates = [];
  const type = printedFacilityType(parsed.facilityNameRaw);
  for (const facility of facilities) {
    if (blockFilter && normalizeDepartment(facility.block) !== blockFilter) continue;
    const name = normalizeFacilityName(facility.name);
    const phc = normalizeFacilityName(facility.phc);
    if (!wanted) continue;
    let score = 0;
    if (name === wanted) score = 100;
    else if (phc && phc === wanted) score = 88;
    else if (name.startsWith(wanted) || wanted.startsWith(name)) score = 74;
    else if (name.includes(wanted) || wanted.includes(name)) score = 62;
    else {
      const a = new Set(wanted.split(" ").filter(Boolean));
      const b = new Set(name.split(" ").filter(Boolean));
      const overlap = [...a].filter((t) => b.has(t)).length;
      const ratio = overlap / Math.max(a.size, b.size, 1);
      if (ratio >= 0.65) score = 45 + ratio * 20;
    }
    if (score <= 0) continue;
    if (type && facility.facilityType && normalizeDepartment(facility.facilityType) === normalizeDepartment(type)) {
      score += 8;
    }
    if (options.ignoreDistrict) ; else if (sameDistrict(parsed, facility)) score += 20;
    else if (parsed.district) score -= 5;
    candidates.push({ facility, score });
  }
  candidates.sort(
    (a, b) => b.score - a.score || a.facility.name.localeCompare(b.facility.name)
  );
  const best = candidates[0];
  const second = candidates[1];
  if (!best || best.score < 55) {
    return {
      facility: null,
      status: "unmatched",
      score: 0,
      alternatives: candidates.slice(0, 3).map((c) => ({
        name: c.facility.name,
        block: c.facility.block,
        score: c.score
      }))
    };
  }
  const ambiguous = second != null && second.score === best.score;
  return {
    facility: best.facility,
    status: ambiguous ? "ambiguous" : "matched",
    score: best.score,
    alternatives: candidates.slice(0, 3).map((c) => ({
      name: c.facility.name,
      block: c.facility.block,
      score: c.score
    }))
  };
}

function cleanWord(value) {
  return value.replace(/\s+/g, " ").trim();
}
function isUsableTextLayer(text) {
  const clean = text.replace(/\f/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return false;
  const letters = clean.replace(/[^A-Za-z]/g, "").length;
  const words = clean.split(" ").filter((word) => /[A-Za-z]{2,}/.test(word));
  if (letters < 28 || words.length < 6) return false;
  return /nqas|national\s+quality|quality\s+assurance|assessment|annexure|facility|score|certif/i.test(
    clean
  );
}
function linesFromWords(words) {
  const usable = words.map((word) => ({ ...word, text: cleanWord(word.text) })).filter((word) => word.text.length > 0).sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const groups = [];
  for (const word of usable) {
    const height = Math.max(1, word.y1 - word.y0);
    const line = groups.find((group) => {
      const anchor = group[0];
      if (!anchor) return false;
      const anchorHeight = Math.max(1, anchor.y1 - anchor.y0);
      return Math.abs(anchor.y0 - word.y0) <= Math.max(4, Math.min(height, anchorHeight) * 0.55);
    });
    if (line) line.push(word);
    else groups.push([word]);
  }
  return groups.map((group) => {
    const ordered = [...group].sort((a, b) => a.x0 - b.x0);
    let text = "";
    let previous = null;
    for (const word of ordered) {
      if (previous) {
        const gap = Math.max(0, word.x0 - previous.x1);
        const spaces = Math.max(1, Math.min(14, Math.round(gap / 8)));
        text += " ".repeat(spaces);
      }
      text += word.text;
      previous = word;
    }
    return { text, y: Math.min(...ordered.map((word) => word.y0)) };
  }).sort((a, b) => a.y - b.y).map((line) => line.text);
}

const PDFJS_VERSION = "4.10.38";
const PDF_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
function textFromItems(items) {
  const lines = /* @__PURE__ */ new Map();
  for (const item of items) {
    if (!item.str?.trim()) continue;
    const y = Math.round(item.transform[5] ?? 0);
    const row = lines.get(y) ?? [];
    row.push({ x: item.transform[4] ?? 0, text: item.str });
    lines.set(y, row);
  }
  return [...lines.entries()].sort(([a], [b]) => b - a).map(
    ([, row]) => row.sort((a, b) => a.x - b.x).map((part) => part.text.replace(/\s+/g, " ").trim()).filter(Boolean).join(" ")
  ).filter(Boolean).join("\n");
}
function wordsFromOcr(data) {
  const direct = [];
  for (const word of data.words ?? []) {
    const box = word.bbox;
    if (!word.text || !box) continue;
    direct.push({
      text: word.text,
      x0: box.x0,
      y0: box.y0,
      x1: box.x1,
      y1: box.y1,
      confidence: word.confidence
    });
  }
  if (direct.length > 0) return direct;
  const nested = [];
  for (const block of data.blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          const box = word.bbox;
          if (!word.text || !box) continue;
          nested.push({
            text: word.text,
            x0: box.x0,
            y0: box.y0,
            x1: box.x1,
            y1: box.y1,
            confidence: word.confidence
          });
        }
      }
    }
  }
  return nested;
}
async function extractResultPdf(source, onProgress) {
  const pdfjs = await __vitePreload(() => import('./vendor-pdfjs-hY71vyYA.js'),true              ?[]:void 0);
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  onProgress?.({ page: 0, total: 0, phase: "opening", message: "Opening the PDF…" });
  const loading = pdfjs.getDocument(
    typeof source === "string" ? { url: source, isEvalSupported: false } : { data: new Uint8Array(await source.arrayBuffer()), isEvalSupported: false }
  );
  const doc = await loading.promise;
  const pages = [];
  let textPages = 0;
  let ocrPages = 0;
  let worker = null;
  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      onProgress?.({
        page: pageNumber,
        total: doc.numPages,
        phase: "text",
        message: `Reading page ${pageNumber} of ${doc.numPages}…`
      });
      const content = await page.getTextContent();
      const items = content.items.filter((item) => "str" in item).map((item) => ({
        str: item.str,
        transform: item.transform
      }));
      const nativeText = textFromItems(items);
      if (isUsableTextLayer(nativeText)) {
        pages.push({ pageNumber, text: nativeText, confidence: 100 });
        textPages += 1;
        continue;
      }
      onProgress?.({
        page: pageNumber,
        total: doc.numPages,
        phase: "ocr",
        message: `Scanned page ${pageNumber} — running OCR…`
      });
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The browser could not prepare a page for OCR.");
      await page.render({ canvasContext: context, viewport }).promise;
      if (!worker) {
        const { createWorker } = await __vitePreload(async () => { const { createWorker } = await import('./vendor-ocr-UhGfDNNW.js').then(n => n.i);return { createWorker }},true              ?__vite__mapDeps([0,1,2]):void 0);
        worker = await createWorker("eng", 1, {
          logger: (message) => {
            if (message.status === "recognizing text") {
              onProgress?.({
                page: pageNumber,
                total: doc.numPages,
                phase: "ocr",
                message: `OCR page ${pageNumber} · ${Math.round((message.progress ?? 0) * 100)}%`
              });
            }
          }
        });
      }
      const result = await worker.recognize(canvas, {}, { text: true, blocks: true });
      const data = result.data;
      const words = wordsFromOcr(data);
      const laidOut = words.length > 0 ? linesFromWords(words).join("\n") : "";
      const text = laidOut || (data.text ?? "").trim();
      if (!text) {
        pages.push({
          pageNumber,
          text: `[Page ${pageNumber}: OCR found no readable text]`,
          confidence: Math.round(data.confidence ?? 0)
        });
      } else {
        pages.push({
          pageNumber,
          text,
          confidence: Math.round(
            words.length ? words.reduce((sum, word) => sum + (word.confidence ?? 0), 0) / words.length : data.confidence ?? 0
          )
        });
      }
      ocrPages += 1;
    }
    onProgress?.({
      page: doc.numPages,
      total: doc.numPages,
      phase: "done",
      message: `Read ${pages.length} page${pages.length === 1 ? "" : "s"}.`
    });
    return { pages, pageCount: doc.numPages, textPages, ocrPages };
  } finally {
    if (worker) await worker.terminate().catch(() => void 0);
    await doc.destroy().catch(() => void 0);
  }
}

const FIELD_KEYS = [
  "certifiedDate",
  "assessmentStart",
  "assessmentEnd",
  "mode",
  "scopeOption",
  "checklistVersion",
  "overallScore",
  "certificationStatus"
];
const FIELD_LABELS = {
  certifiedDate: "Letter date",
  assessmentStart: "Assessment start",
  assessmentEnd: "Assessment end",
  mode: "Mode",
  scopeOption: "Scope / packages",
  checklistVersion: "Checklist / criteria",
  overallScore: "Overall score",
  certificationStatus: "Certification status"
};
const FIELD_TO_APPLY = {
  certifiedDate: "certificationDate",
  assessmentStart: "assessmentStartDate",
  assessmentEnd: "assessmentEndDate",
  mode: "mode",
  scopeOption: "scopeOption",
  checklistVersion: "checklistVersion",
  overallScore: "overallScore",
  certificationStatus: "certificationStatus"
};
function numberValue(value) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
  return Math.round(parsed * 100) / 100;
}
function fieldAccepted(row, field) {
  return row.included[field] && row.values[field].trim() !== "" && (!row.doubtful[field] || row.confirmed[field]);
}
function acceptCount(row) {
  return FIELD_KEYS.filter((field) => fieldAccepted(row, field)).length;
}
function selectedRowsOf(rows) {
  return rows.filter((row) => row.selected);
}
function blockedReason(rows) {
  const selected = selectedRowsOf(rows);
  if (selected.length === 0) return "Tick a value and select at least one row before saving.";
  if (selected.every((row) => acceptCount(row) === 0)) {
    return "Tick a value in each selected row before saving.";
  }
  const doubt = selected.find(
    (row) => FIELD_KEYS.some(
      (field) => row.included[field] && row.doubtful[field] && !row.confirmed[field]
    )
  );
  if (doubt) {
    return "Confirm the yellow values before saving — they were read with low confidence.";
  }
  if (selected.some(
    (row) => !row.facilityId || !row.cycleId || row.scoreEnabled && row.scoreDoubtful && !row.scoreConfirmed || row.scoreEnabled && row.scoreConflict && !row.scoreConfirmed
  )) {
    return "Choose a facility and cycle, and confirm any doubtful scores before saving.";
  }
  return null;
}
function toApplyItems(rows) {
  return selectedRowsOf(rows).flatMap((row) => {
    const fields = {};
    for (const field of FIELD_KEYS) {
      if (!fieldAccepted(row, field)) continue;
      const key = FIELD_TO_APPLY[field];
      if (field === "overallScore") {
        const value = numberValue(row.values[field]);
        if (value != null) fields.overallScore = value;
      } else if (key !== "overallScore") {
        fields[key] = row.values[field].trim();
      }
    }
    if (Object.keys(fields).length === 0 && !row.scoreEnabled) return [];
    return [
      {
        documentId: row.documentId,
        facilityId: row.facilityId,
        cycleId: row.cycleId,
        pageNumber: row.annexurePage ?? row.letterPage,
        annexureFacilityName: row.sourceName || row.facilityName,
        district: row.district,
        fileHash: row.documentHash,
        fields,
        saveScores: row.scoreEnabled,
        decision: row.decision,
        warnings: row.warnings,
        overallScore: row.overallScore,
        pssScore: row.pssScore,
        letterScore: row.overallScore,
        areas: row.areas,
        departments: row.departments
      }
    ];
  });
}

function emptyValues() {
  return Object.fromEntries(FIELD_KEYS.map((field) => [field, ""]));
}
function emptyFlags(value) {
  return Object.fromEntries(FIELD_KEYS.map((field) => [field, value]));
}
function isoDate(value) {
  return value ?? "";
}
function numberText(value) {
  return value == null ? "" : String(value);
}
function sourceFor(page, confidence, text) {
  return {
    page: Math.max(1, page ?? 1),
    confidence: Math.round(confidence ?? 0),
    text
  };
}
function normaliseName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function sameScore(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 5e-3;
}
async function sha256File(file) {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return `local:${file.name}:${file.size}:${file.lastModified}`;
  }
}
function LazyResultReadDialog({
  open,
  onOpenChange,
  documentIds,
  facilityId,
  localFile,
  onAttachLocal,
  onDetachLocal,
  onReattach,
  onApplied
}) {
  const contexts = useQuery(
    api.resultRead.contexts,
    open ? { documentIds, facilityId: facilityId ?? void 0 } : "skip"
  );
  const apply = useMutation(api.resultRead.apply);
  const storedUrl = useDocumentUrl(documentIds[0] ?? null, "inline", open && documentIds.length > 0);
  const [extraction, setExtraction] = reactExports.useState(null);
  const [progress, setProgress] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [reading, setReading] = reactExports.useState(false);
  const [rows, setRows] = reactExports.useState([]);
  const [localHash, setLocalHash] = reactExports.useState("");
  const [busy, setBusy] = reactExports.useState(false);
  const [sourceOpen, setSourceOpen] = reactExports.useState(false);
  const [retryKey, setRetryKey] = reactExports.useState(0);
  const started = reactExports.useRef("");
  const [uploadSent, setUploadSent] = reactExports.useState(0);
  reactExports.useEffect(() => {
    if (!open) {
      started.current = "";
      setExtraction(null);
      setRows([]);
      setProgress(null);
      setError(null);
      setReading(false);
      setSourceOpen(false);
      setUploadSent(0);
      return;
    }
    if (!localFile && !storedUrl) return;
    const key = localFile ? `file:${localFile.name}:${localFile.size}:${localFile.lastModified}` : `url:${storedUrl}:${retryKey}`;
    if (started.current === key) return;
    started.current = key;
    let live = true;
    setReading(true);
    setError(null);
    setExtraction(null);
    setRows([]);
    if (localFile) {
      void sha256File(localFile).then((hash) => {
        if (live) setLocalHash(hash);
      });
    }
    void extractResultPdf(localFile ?? storedUrl ?? "", (next) => {
      if (live) setProgress(next);
    }).then((result) => {
      if (!live) return;
      setExtraction({ pages: result.pages, textPages: result.textPages, ocrPages: result.ocrPages });
    }).catch((err) => {
      if (!live) return;
      setError(err instanceof Error ? err.message : "The PDF could not be read.");
    }).finally(() => {
      if (live) setReading(false);
    });
    return () => {
      live = false;
    };
  }, [open, localFile, storedUrl, retryKey]);
  const candidates = reactExports.useMemo(() => {
    if (!contexts || !extraction) return [];
    const letters = parseTargetResultLetter(extraction.pages);
    const sections = parseAnnexureText(extraction.pages.map((page) => page.text).join("\f"), {
      departmentNames: contexts.departmentNames
    });
    const map = /* @__PURE__ */ new Map();
    const keyFor = (name, match) => match.facility ? `f:${match.facility._id}` : `n:${normaliseName(name)}`;
    for (const letter of letters) {
      const match = matchAnnexureFacility(letter, contexts.facilities);
      const key = keyFor(letter.facilityNameRaw, match);
      map.set(key, { letter, section: null, match, key });
    }
    for (const section of sections) {
      const match = matchAnnexureFacility(section, contexts.facilities);
      const key = keyFor(section.facilityNameRaw, match);
      const found = map.get(key);
      if (found) found.section = section;
      else map.set(key, { letter: null, section, match, key });
    }
    return [...map.values()];
  }, [contexts, extraction]);
  reactExports.useEffect(() => {
    if (!contexts || candidates.length === 0) {
      setRows([]);
      return;
    }
    const doc = contexts.documents.find((item) => item.ok) ?? null;
    const next = candidates.map((candidate) => {
      const facility = candidate.match.facility;
      const currentCycleNumber = contexts.facilities.find((item) => item._id === facility?._id)?.currentCycleNumber ?? null;
      const cycles = facility ? contexts.cycles.filter((cycle2) => cycle2.facilityId === facility._id).sort((a, b) => b.cycleNumber - a.cycleNumber) : [];
      const cycle = cycles.find((row) => !row.superseded && row.cycleNumber === currentCycleNumber) ?? cycles.find((row) => !row.superseded) ?? cycles[0] ?? null;
      const existing = cycle ? contexts.existing.find(
        (row) => row.facilityId === facility?._id && row.cycleId === cycle._id
      ) ?? null : null;
      const letter = candidate.letter;
      const section = candidate.section;
      const values = emptyValues();
      values.certifiedDate = isoDate(letter?.letterDate);
      values.assessmentStart = isoDate(letter?.assessmentStartDate ?? section?.assessmentDate);
      values.assessmentEnd = isoDate(letter?.assessmentEndDate ?? section?.assessmentDate);
      values.mode = letter?.mode ?? "";
      values.scopeOption = letter?.packageCount != null ? `${letter.packageCount} Service Packages` : section?.departmentsKind === "package" && section.departments.length > 0 ? `${section.departments.length} Service Packages` : "";
      values.checklistVersion = letter?.criteriaMet != null && letter.criteriaTotal != null ? `Met ${letter.criteriaMet} out of ${letter.criteriaTotal} Criteria` : "";
      values.overallScore = numberText(letter?.overallScore ?? section?.overallScore);
      values.certificationStatus = letter?.certificationStatus ?? "";
      const before = {
        certifiedDate: existing?.fields?.certificationDate ?? existing?.fields?.goiLetterDate ?? "",
        assessmentStart: existing?.fields?.actualStartDate ?? "",
        assessmentEnd: existing?.fields?.actualEndDate ?? "",
        mode: existing?.fields?.mode ?? "",
        scopeOption: existing?.fields?.scopeOption ?? "",
        checklistVersion: existing?.fields?.checklistVersion ?? "",
        overallScore: numberText(existing?.fields?.scorePercent),
        certificationStatus: existing?.fields?.certificationStatus ?? ""
      };
      const page = letter?.pageNumber ?? section?.pageNumber ?? 1;
      const pageConfidence = extraction?.pages.find((p) => p.pageNumber === page)?.confidence;
      const sources = Object.fromEntries(
        FIELD_KEYS.map((field) => [field, sourceFor(page, pageConfidence)])
      );
      const scoreSource = section ? sourceFor(section.pageNumber, pageConfidence) : null;
      const scoreConfidence = pageConfidence ?? 0;
      const scoreDoubtful = !!section && scoreConfidence > 0 && scoreConfidence < 65;
      const overall = letter?.overallScore ?? section?.overallScore ?? null;
      const warnings = [...letter?.warnings ?? [], ...section?.warnings ?? []];
      if (candidate.match.status !== "matched") {
        warnings.push(
          candidate.match.status === "ambiguous" ? "This facility name matches more than one facility — choose the right one." : "This facility was not matched — choose it before applying."
        );
      }
      if (!cycle) warnings.push("This facility has no certification cycle to write to.");
      return {
        key: candidate.key,
        documentId: doc?.id ?? "",
        documentName: doc?.name ?? localFile?.name ?? "NQAS Result.pdf",
        documentHash: doc?.sha256 ?? localHash,
        facilityId: facility?._id ?? "",
        facilityName: facility?.name ?? letter?.facilityNameRaw ?? section?.facilityNameRaw ?? "Unmatched facility",
        block: facility?.block ?? letter?.district ?? section?.district ?? "",
        cycleId: cycle?._id ?? "",
        cycleNumber: cycle?.cycleNumber ?? 0,
        letterPage: letter?.pageNumber ?? 1,
        annexurePage: section?.pageNumber ?? null,
        sourceName: letter?.facilityNameRaw ?? section?.facilityNameRaw ?? "",
        district: letter?.district ?? section?.district ?? null,
        before,
        values,
        included: Object.fromEntries(FIELD_KEYS.map((field) => [field, values[field].trim() !== ""])),
        doubtful: Object.fromEntries(FIELD_KEYS.map((field) => [field, values[field] !== "" && (pageConfidence ?? 0) > 0 && (pageConfidence ?? 0) < 65])),
        confirmed: emptyFlags(true),
        sources,
        selected: false,
        packagesText: values.scopeOption,
        criteriaText: values.checklistVersion,
        hasScores: !!section && (section.areas.length > 0 || section.departments.length > 0 || section.overallScore != null),
        areas: section?.areas?.map((area) => ({ key: area.key, name: area.name, score: area.score })) ?? [],
        departments: section?.departments?.map((department) => ({
          name: department.name,
          canonicalName: department.canonicalName,
          score: department.score,
          isNew: department.isNew,
          kind: section.departmentsKind
        })) ?? [],
        pssScore: section?.pssScore ?? null,
        overallScore: overall,
        scoreEnabled: false,
        scoreConfirmed: !scoreDoubtful,
        scoreDoubtful,
        scoreSource,
        decision: existing?.scores ? "skip" : "replace",
        scoreConflict: !!existing?.scores && overall != null && !sameScore(existing.scores.overallScore, overall),
        warnings: [...new Set(warnings)],
        existingScores: existing?.scores ?? null,
        manual: !candidate.match.facility
      };
    });
    setRows(next);
  }, [candidates, contexts, extraction, localFile, localHash]);
  const selected = selectedRowsOf(rows);
  const blocked = blockedReason(rows);
  const pdfUrl = storedUrl;
  const resolution = rows.length > 0 ? rows.filter((row) => row.facilityId && row.cycleId).length : 0;
  const updateRow = (key, patch) => {
    setRows(
      (current) => current.map(
        (row) => row.key === key ? typeof patch === "function" ? patch(row) : { ...row, ...patch } : row
      )
    );
  };
  const chooseFacility = (row, nextFacilityId) => {
    const facility = contexts?.facilities.find((item) => item._id === nextFacilityId) ?? null;
    const cycles = contexts?.cycles.filter((cycle2) => cycle2.facilityId === nextFacilityId).sort((a, b) => b.cycleNumber - a.cycleNumber) ?? [];
    const cycle = cycles.find((item) => !item.superseded && item.cycleNumber === facility?.currentCycleNumber) ?? cycles.find((item) => !item.superseded) ?? cycles[0] ?? null;
    const existing = cycle ? contexts?.existing.find(
      (item) => item.facilityId === nextFacilityId && item.cycleId === cycle._id
    ) ?? null : null;
    updateRow(row.key, {
      facilityId: nextFacilityId,
      facilityName: facility?.name ?? row.facilityName,
      block: facility?.block ?? row.block,
      cycleId: cycle?._id ?? "",
      cycleNumber: cycle?.cycleNumber ?? 0,
      before: {
        certifiedDate: existing?.fields?.certificationDate ?? existing?.fields?.goiLetterDate ?? "",
        assessmentStart: existing?.fields?.actualStartDate ?? "",
        assessmentEnd: existing?.fields?.actualEndDate ?? "",
        mode: existing?.fields?.mode ?? "",
        scopeOption: existing?.fields?.scopeOption ?? "",
        checklistVersion: existing?.fields?.checklistVersion ?? "",
        overallScore: numberText(existing?.fields?.scorePercent),
        certificationStatus: existing?.fields?.certificationStatus ?? ""
      },
      existingScores: existing?.scores ?? null,
      scoreConflict: !!existing?.scores && row.overallScore != null && !sameScore(existing.scores.overallScore, row.overallScore)
    });
  };
  const chooseCycle = (row, cycleId) => {
    const cycle = contexts?.cycles.find((item) => item._id === cycleId) ?? null;
    const existing = contexts?.existing.find(
      (item) => item.facilityId === row.facilityId && item.cycleId === cycleId
    ) ?? null;
    updateRow(row.key, {
      cycleId,
      cycleNumber: cycle?.cycleNumber ?? 0,
      before: {
        certifiedDate: existing?.fields?.certificationDate ?? existing?.fields?.goiLetterDate ?? "",
        assessmentStart: existing?.fields?.actualStartDate ?? "",
        assessmentEnd: existing?.fields?.actualEndDate ?? "",
        mode: existing?.fields?.mode ?? "",
        scopeOption: existing?.fields?.scopeOption ?? "",
        checklistVersion: existing?.fields?.checklistVersion ?? "",
        overallScore: numberText(existing?.fields?.scorePercent),
        certificationStatus: existing?.fields?.certificationStatus ?? ""
      },
      existingScores: existing?.scores ?? null,
      scoreConflict: !!existing?.scores && row.overallScore != null && !sameScore(existing.scores.overallScore, row.overallScore)
    });
  };
  const runApply = async () => {
    if (blocked || selected.length === 0) {
      toast.error(blocked ?? "Select at least one row.");
      return;
    }
    let documentId = rows.find((row) => row.documentId)?.documentId ?? "";
    let attachedId = "";
    setBusy(true);
    try {
      if (localFile && onAttachLocal) {
        const attached = await onAttachLocal(
          localFile,
          (sent, total) => setUploadSent(total > 0 ? Math.round(sent / total * 100) : 0)
        );
        documentId = attached?.documentId ?? "";
        attachedId = documentId;
      }
      if (!documentId) throw new Error("Upload the PDF before applying the extracted values.");
      const items = toApplyItems(rows).map((item) => ({ ...item, documentId }));
      if (items.length === 0) throw new Error("Select at least one row with an accepted change.");
      const result = await apply({ items });
      toast.success(`Applied ${result.applied} row${result.applied === 1 ? "" : "s"}`, {
        description: result.skipped ? `${result.skipped} row${result.skipped === 1 ? " was" : "s were"} skipped by the server.` : "The read is in the audit trail and can be undone."
      });
      onApplied?.(result.batchId, result.applied);
      onOpenChange(false);
    } catch (err) {
      if (attachedId && onDetachLocal) {
        await Promise.resolve(onDetachLocal(attachedId)).catch(() => void 0);
      }
      toast.error(err instanceof Error ? err.message : "The extracted result could not be saved.");
    } finally {
      setBusy(false);
      setUploadSent(0);
    }
  };
  if (!open) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DialogContent, { className: "max-h-[92vh] max-w-6xl overflow-hidden p-0", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex max-h-[92vh] flex-col", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogHeader, { className: "border-b border-border/60 px-5 py-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogTitle, { className: "flex items-center gap-2 text-base", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ScanText, { className: "size-4 text-primary" }),
        " Read NQAS result PDF"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(DialogDescription, { className: "text-xs", children: "Review every extracted value. Nothing is saved until you select a row and press Apply." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4", children: [
      (reading || progress) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-border/60 bg-muted/25 p-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 text-xs font-medium", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: cn("size-4", !reading && "hidden") }),
          progress?.message ?? "Preparing the PDF…"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Progress,
          {
            className: "mt-2 h-1.5",
            value: progress?.total ? Math.round((progress.page - (progress.phase === "ocr" ? 0.5 : 0)) / progress.total * 100) : 8
          }
        )
      ] }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-950", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "flex items-center gap-1.5 font-semibold", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { className: "size-4" }),
          " The result PDF could not be read"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1", children: error }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(Button, { size: "sm", variant: "outline", className: "h-7 gap-1", onClick: () => setRetryKey((v) => v + 1), children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { className: "size-3" }),
            " Retry"
          ] }),
          localFile && onReattach && /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { size: "sm", variant: "outline", className: "h-7 gap-1", onClick: () => onReattach(localFile), children: "Choose another PDF" })
        ] })
      ] }),
      extraction && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-3" }),
          " ",
          extraction.pages.length,
          " pages read"
        ] }),
        extraction.textPages > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          extraction.textPages,
          " native text"
        ] }),
        extraction.ocrPages > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          extraction.ocrPages,
          " OCR"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "· ",
          resolution,
          " of ",
          rows.length,
          " rows resolved"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            className: "ml-auto inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline",
            onClick: () => setSourceOpen((value) => !value),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(FileSearch, { className: "size-3" }),
              " ",
              sourceOpen ? "Hide" : "View",
              " source PDF"
            ]
          }
        )
      ] }),
      sourceOpen && /* @__PURE__ */ jsxRuntimeExports.jsx(
        PdfCanvasViewer,
        {
          url: pdfUrl,
          file: localFile,
          label: rows[0]?.documentName ?? "Result PDF",
          className: "h-80"
        }
      ),
      !reading && !error && extraction && rows.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-lg border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground", children: "No facility row with a date and score was found. Use manual entry or check that this is the NQAS result letter." }),
      rows.map((row) => {
        const selectedRow = row.selected;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "section",
          {
            className: cn(
              "rounded-xl border bg-background",
              selectedRow ? "border-primary/40" : "border-border/60"
            ),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    checked: selectedRow,
                    onCheckedChange: (value) => updateRow(row.key, { selected: value === true }),
                    "aria-label": `Select ${row.facilityName}`
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "truncate text-sm font-semibold", children: row.facilityName }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[11px] text-muted-foreground", children: [
                    row.block || "No block",
                    " · Page ",
                    row.letterPage,
                    row.annexurePage ? ` / Annexure page ${row.annexurePage}` : ""
                  ] })
                ] }),
                row.scoreConflict && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900", children: "Score conflict" }),
                selectedRow && /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "size-4 text-emerald-600" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-[11px] font-medium", children: [
                  "Facility",
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: row.facilityId || "none", onValueChange: (value) => chooseFacility(row, value), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "mt-1 h-8 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Choose facility" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "none", children: "Choose facility" }),
                      contexts?.facilities.map((facility) => /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectItem, { value: facility._id, children: [
                        facility.name,
                        " · ",
                        facility.block
                      ] }, facility._id))
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-[11px] font-medium", children: [
                  "Cycle",
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(Select, { value: row.cycleId || "none", onValueChange: (value) => chooseCycle(row, value), children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(SelectTrigger, { className: "mt-1 h-8 text-xs", children: /* @__PURE__ */ jsxRuntimeExports.jsx(SelectValue, { placeholder: "Choose cycle" }) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectContent, { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(SelectItem, { value: "none", children: "Choose cycle" }),
                      (contexts?.cycles ?? []).filter((cycle) => cycle.facilityId === row.facilityId).sort((a, b) => b.cycleNumber - a.cycleNumber).map((cycle) => /* @__PURE__ */ jsxRuntimeExports.jsxs(SelectItem, { value: cycle._id, children: [
                        "Cycle #",
                        cycle.cycleNumber,
                        cycle.superseded ? " (old)" : ""
                      ] }, cycle._id))
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "self-end text-[10px] text-muted-foreground", children: [
                  "Confidence ",
                  row.sources.overallScore.confidence || "-",
                  "% · ",
                  row.documentName
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2 border-t border-border/40 p-3 sm:grid-cols-2 lg:grid-cols-4", children: FIELD_KEYS.map((field) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Checkbox,
                    {
                      checked: row.included[field],
                      onCheckedChange: (value) => updateRow(row.key, (current) => ({
                        ...current,
                        included: { ...current.included, [field]: value === true }
                      })),
                      "aria-label": `Include ${FIELD_LABELS[field]}`
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "truncate text-[10.5px] font-semibold", children: FIELD_LABELS[field] }),
                  row.doubtful[field] && !row.confirmed[field] && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "rounded bg-amber-100 px-1 text-[9px] font-semibold text-amber-900", children: "Check" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    value: row.values[field],
                    onChange: (event) => updateRow(row.key, (current) => ({
                      ...current,
                      values: { ...current.values, [field]: event.target.value },
                      included: { ...current.included, [field]: true }
                    })),
                    className: "mt-1 h-8 text-xs",
                    "aria-label": `${FIELD_LABELS[field]} for ${row.facilityName}`
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-0.5 flex items-center justify-between gap-1 text-[9.5px] text-muted-foreground", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                    "p.",
                    row.sources[field].page,
                    row.sources[field].confidence > 0 ? ` · ${row.sources[field].confidence}%` : ""
                  ] }),
                  row.doubtful[field] && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "inline-flex items-center gap-1", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "checkbox",
                        checked: row.confirmed[field],
                        onChange: (event) => updateRow(row.key, (current) => ({
                          ...current,
                          confirmed: { ...current.confirmed, [field]: event.target.checked }
                        }))
                      }
                    ),
                    "Confirm"
                  ] })
                ] })
              ] }, field)) }),
              row.hasScores && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap items-center gap-2 border-t border-border/40 px-3 py-2 text-[11px]", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Checkbox,
                  {
                    checked: row.scoreEnabled,
                    onCheckedChange: (value) => updateRow(row.key, { scoreEnabled: value === true }),
                    "aria-label": `Save Annexure scores for ${row.facilityName}`
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium", children: "Include Annexure scores" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
                  row.areas.length,
                  " areas · ",
                  row.departments.length,
                  " departments"
                ] }),
                row.existingScores && row.scoreEnabled && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1.5 text-[10.5px] text-amber-800", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: row.decision === "replace",
                      onChange: (event) => updateRow(row.key, {
                        decision: event.target.checked ? "replace" : "skip"
                      })
                    }
                  ),
                  "Replace existing Annexure scores"
                ] }),
                row.scoreDoubtful && !row.scoreConfirmed && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "ml-auto inline-flex items-center gap-1 text-amber-800", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: row.scoreConfirmed,
                      onChange: (event) => updateRow(row.key, { scoreConfirmed: event.target.checked })
                    }
                  ),
                  "Confirm low-confidence scores"
                ] })
              ] }),
              row.warnings.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/40 px-3 py-2 text-[10.5px] text-amber-800", children: row.warnings.map((warning) => /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                "• ",
                warning
              ] }, warning)) })
            ]
          },
          row.key
        );
      })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(DialogFooter, { className: "border-t border-border/60 px-5 py-3 sm:justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(ShieldCheck, { className: "size-3.5 shrink-0" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          selected.length,
          " selected · ",
          rows.filter((row) => row.facilityId && row.cycleId).length,
          " resolved",
          busy && uploadSent > 0 ? ` · uploading ${uploadSent}%` : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: busy, children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          Button,
          {
            onClick: () => void runApply(),
            disabled: busy || !extraction || selected.length === 0 || !!blocked,
            children: [
              busy ? /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "mr-1.5 size-4 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Check, { className: "mr-1.5 size-4" }),
              "Apply selected (",
              selected.length,
              ")"
            ]
          }
        )
      ] })
    ] }),
    blocked && selected.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "border-t border-amber-200 bg-amber-50 px-5 py-2 text-[11px] text-amber-900", children: blocked })
  ] }) }) });
}

export { LazyResultReadDialog as L, Progress as P };
