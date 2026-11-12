import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireActivatedUser, canEdit } from "./facilities";

/* ================================================================
 *  NOC ISSUE DATE SEEDER (bulk-import companion)
 *  The main import in ops.ts seeds the Fire NOC record but its NOC
 *  block cannot seed the issue date, so "NOC Issue Date" stayed blank
 *  for imported rows. This companion mutation re-parses the SAME csv,
 *  matches each row to its facility (NIN when present, else
 *  block+name), and fills the missing `issuedDate` on the facility's
 *  newest fireNocs record. Safe to re-run: only fills blank dates and
 *  never overwrites a value the user set.
 * ================================================================ */

type SeedRow = { cells: string[]; lineNo: number };

function tokenize(text: string): SeedRow[] {
  const rows: SeedRow[] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuotes = false;
  let lineNo = 1;
  let rowLine = 1;
  const pushCell = () => { cur.push(cell.trim()); cell = ""; };
  const pushRow = () => {
    pushCell();
    if (cur.some((c) => c.length > 0)) rows.push({ cells: cur, lineNo: rowLine });
    cur = [];
    rowLine = lineNo;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") lineNo++;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === "," || ch === "\t") pushCell();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else cell += ch;
  }
  if (cell.length > 0 || cur.length > 0) pushRow();
  return rows;
}

const normalizeHeader = (h: string): string =>
  h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const FACILITY_ALIASES = ["facility_name", "name", "facility", "name_of_facility", "name_of_the_facility", "institution_name", "name_of_institution", "facility_institution_name", "hf_name"];
const BLOCK_ALIASES = ["block", "block_name", "name_of_block", "name_of_the_block", "blockname"];
const NIN_ALIASES = ["nin", "nin_number", "nin_no", "ninnumber", "facility_nin", "national_identification_number"];
const ISSUE_ALIASES = ["noc_issue_date", "fire_noc_issue_date", "noc_issued_date", "fire_noc_issued_date", "fire_noc_issue", "noc_issue", "certified_date"];

function parseImportDate(v: string): string | undefined {
  const s = v.trim();
  if (!s || /^(na|n\/a|-|—)$/i.test(s)) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return undefined;
}

export const seedNocIssueDates = mutation({
  args: { csv: v.string() },
  handler: async (ctx, { csv: rawCsv }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");

    const rows = tokenize(rawCsv.replace(/^\uFEFF/, ""));
    if (rows.length < 2) return { seeded: 0, missingDate: 0 };

    // Locate the header within the first 10 rows.
    let headerIdx = -1;
    let iName = -1, iBlock = -1, iNin = -1, iIssue = -1;
    for (let h = 0; h < Math.min(10, rows.length); h++) {
      const headers = rows[h].cells.map(normalizeHeader).filter(Boolean);
      const find = (aliases: string[]) =>
        headers.findIndex((x) => aliases.includes(x));
      iName = find(FACILITY_ALIASES);
      if (iName < 0) {
        iName = headers.findIndex(
          (x) => x.includes("name") && (x.includes("facility") || x.includes("institution")),
        );
      }
      if (iName >= 0) {
        headerIdx = h;
        iBlock = find(BLOCK_ALIASES);
        iNin = find(NIN_ALIASES);
        iIssue = find(ISSUE_ALIASES);
        if (iIssue < 0)
          iIssue = headers.findIndex((x) => x.includes("noc") && x.includes("issue"));
        break;
      }
    }
    if (headerIdx < 0 || iIssue < 0) return { seeded: 0, missingDate: 0 };

    const cell = (row: SeedRow, i: number) => (row.cells[i] ?? "").trim();

    // Facility lookup maps — NIN first, then block+name.
    const facilities = await ctx.db.query("facilities").collect();
    const byNin = new Map(facilities.filter((f) => f.ninNumber).map((f) => [f.ninNumber as string, f]));
    const byKey = new Map(facilities.map((f) => [`${f.block}||${f.name.toLowerCase()}`, f]));

    let seeded = 0;
    let missingDate = 0;
    for (const row of rows.slice(headerIdx + 1)) {
      const issuedRaw = cell(row, iIssue);
      const issued = parseImportDate(issuedRaw);
      const name = cell(row, iName);
      if (!name) continue;
      const nin = cell(row, iNin);
      const block = iBlock >= 0 ? cell(row, iBlock) : "";
      const fac =
        (nin && byNin.get(nin)) ||
        byKey.get(`${block || "Unassigned"}||${name.toLowerCase()}`) ||
        byKey.get(`Unassigned||${name.toLowerCase()}`);
      if (!fac) { if (issued) missingDate += 1; continue; }
      if (!issued) { missingDate += 1; continue; }

      const nocs = await ctx.db
        .query("fireNocs")
        .withIndex("by_facility", (q) => q.eq("facilityId", fac._id))
        .collect();
      if (nocs.length === 0) { missingDate += 1; continue; }
      nocs.sort((a, b) =>
        (b.expiryDate ?? "").localeCompare(a.expiryDate ?? "") ||
        b._creationTime - a._creationTime,
      );
      const noc = nocs[0];
      if (noc.issuedDate) continue; // never overwrite
      await ctx.db.patch(noc._id, {
        issuedDate: issued,
        updatedAt: Date.now(),
      });
      seeded += 1;
      await ctx.db.insert("auditLogs", {
        table: "fireNocs",
        recordId: String(noc._id),
        facilityId: fac._id,
        action: "update",
        field: "NOC Issue Date (import seed)",
        oldValue: null,
        newValue: issued,
        changedBy: user._id,
        changedByName: user.name,
        changedAt: Date.now(),
      });
    }
    return { seeded, missingDate };
  },
});
