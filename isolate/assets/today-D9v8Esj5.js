import './AppShell-CP099uvN.js';

function todayLocalIso() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function isTodayOrFuture(iso) {
  return !!iso && iso >= todayLocalIso();
}
function deriveFireNocStatus(nocAvailable, expiryDate, storedStatus, leadDays = 90, today = todayLocalIso()) {
  if (nocAvailable === "No") return "Not Obtained";
  if (!expiryDate) return storedStatus || "Not Obtained";
  if (expiryDate < today) return "Expired";
  const daysLeft = Math.round((Date.parse(expiryDate) - Date.parse(today)) / 864e5);
  return daysLeft <= leadDays ? "Expiring Soon" : "Valid";
}

export { deriveFireNocStatus as d, isTodayOrFuture as i, todayLocalIso as t };
