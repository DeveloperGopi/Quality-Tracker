function fiscalYearOf(iso) {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return m >= 4 ? y : y - 1;
}
function fiscalYearLabel(startYear) {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}
function currentFiscalYear(today = todayLocalIsoSafe()) {
  return fiscalYearOf(today);
}
function todayLocalIsoSafe() {
  if (typeof document !== "undefined") {
    const d2 = /* @__PURE__ */ new Date();
    return `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(
      d2.getDate()
    ).padStart(2, "0")}`;
  }
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export { fiscalYearOf as a, currentFiscalYear as c, fiscalYearLabel as f };
