import { d7 as LEGACY_LABELS_BY_LABEL } from './AppShell-CP099uvN.js';

const HEADER_OVERRIDES_KEY = "tableHeaderOverrides";
function withOverrides(headers, overrides) {
  if (!overrides) return [...headers];
  return headers.map((h) => {
    const legacy = (LEGACY_LABELS_BY_LABEL[h] ?? []).map((l) => overrides[l]).find((v) => typeof v === "string" && v.trim() !== "");
    const custom = overrides[h] ?? legacy;
    return typeof custom === "string" && custom.trim() ? custom : h;
  });
}
function buildOverrides(defaults, values) {
  const out = {};
  for (const d of defaults) {
    const v = (values[d] ?? "").trim();
    if (v && v !== d) out[d] = v;
  }
  return out;
}

export { HEADER_OVERRIDES_KEY as H, buildOverrides as b, withOverrides as w };
