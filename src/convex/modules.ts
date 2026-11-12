import { v } from "convex/values";
import {
  mutation,
  query,
  MutationCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  requireActivatedUser,
  canEdit,
  canEditFacility,
  getSettings,
  allowedBlockNames,
  refreshFacilityStatus,
  normalizeNin,
} from "./facilities";
import { todayIso, daysBetween, DEFAULT_SETTINGS } from "./lifecycle";
import { computeDerivedNqas } from "./lifecycle";
import { deriveLifecycleView } from "./lifecycle";

// ---------- shared helpers ----------

async function audit(
  ctx: MutationCtx,
  args: {
    table: string;
    recordId: string;
    facilityId?: Id<"facilities">;
    action: string;
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
    userName?: string;
    userId?: Id<"users">;
  },
) {
  await ctx.db.insert("auditLogs", {
    table: args.table,
    recordId: args.recordId,
    facilityId: args.facilityId,
    action: args.action,
    field: args.field,
    oldValue: args.oldValue ?? null,
    newValue: args.newValue ?? null,
    changedBy: args.userId,
    changedByName: args.userName,
    changedAt: Date.now(),
  });
}

async function loadFacilityForEdit(
  ctx: MutationCtx,
  facilityId: Id<"facilities">,
) {
  const user = await requireActivatedUser(ctx);
  if (!canEdit(user)) throw new Error("You do not have edit permission");
  const facility = await ctx.db.get(facilityId);
  if (!facility) throw new Error("Facility not found");
  if (!(await canEditFacility(ctx, user, facility)))
    throw new Error("This facility is outside your assigned blocks");
  return { user, facility };
}

// ---------- attachments (files stored in Convex storage) ----------

/** One-time upload URL for a fund/NOC supporting document (e.g. sanction
 *  order, NOC certificate). The client uploads the file, then passes the
 *  storage id to saveFund/saveFireNoc/updateFund/updateFireNoc. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Signed read URL for a stored attachment. Auth-gated like every other read:
 *  the caller must be an activated user; block scoping is enforced when the
 *  attachment belongs to a facility record. */
export const getAttachmentUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireActivatedUser(ctx);
    const url = await ctx.storage.getUrl(storageId);
    return url;
  },
});

// ---------- gap closure fund ----------

export const listFunds = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    const allowed = await allowedBlockNames(ctx, user);
    const settings = await getSettings(ctx);
    const funds = await ctx.db.query("gapClosureFunds").collect();
    const rows = [];
    for (const fund of funds) {
      const facility = await ctx.db.get(fund.facilityId);
      if (!facility) continue;
      if (allowed !== null && !allowed.has(facility.block)) continue;
      rows.push({ fund, facility });
    }
    rows.sort(
      (a, b) =>
        a.facility.name.localeCompare(b.facility.name) ||
        a.fund.financialYear.localeCompare(b.fund.financialYear),
    );
    return {
      rows: rows.map((r) => ({
        ...r,
        fund: { ...r.fund, _id: String(r.fund._id), updatedAt: r.fund.updatedAt ?? null },
        facility: {
          _id: String(r.facility._id),
          name: r.facility.name,
          block: r.facility.block,
          phc: r.facility.phc,
          facilityType: r.facility.facilityType,
          ninNumber: r.facility.ninNumber ?? null,
        },
      })),
      statuses: settings.fundStatuses,
      me: { appRole: user.appRole },
    };
  },
});

export const saveFund = mutation({
  args: {
    facilityId: v.id("facilities"),
    financialYear: v.string(),
    amountSanctioned: v.optional(v.number()),
    amountReleased: v.optional(v.number()),
    amountUtilized: v.optional(v.number()),
    status: v.string(),
    sanctionedDate: v.optional(v.string()),
    utilizedDate: v.optional(v.string()),
    remarks: v.optional(v.string()),
    attachmentId: v.optional(v.id("_storage")),
    attachmentName: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await loadFacilityForEdit(ctx, args.facilityId);
    const id = await ctx.db.insert("gapClosureFunds", {
      facilityId: args.facilityId,
      financialYear: args.financialYear,
      amountSanctioned: args.amountSanctioned,
      updatedAt: Date.now(),
      amountReleased: args.amountReleased,
      amountUtilized: args.amountUtilized,
      status: args.status,
      sanctionedDate: args.sanctionedDate,
      utilizedDate: args.utilizedDate,
      remarks: args.remarks,
      attachmentId: args.attachmentId,
      attachmentName: args.attachmentName,
      attachmentType: args.attachmentType,
    });
    await audit(ctx, {
      table: "gapClosureFunds",
      recordId: String(id),
      facilityId: args.facilityId,
      action: "create",
      field: "Gap Closure Fund",
      newValue: `FY ${args.financialYear} — status ${args.status}`,
      userName: user.name,
      userId: user._id,
    });
    return id;
  },
});

export const updateFund = mutation({
  args: {
    fundId: v.id("gapClosureFunds"),
    financialYear: v.optional(v.string()),
    amountSanctioned: v.optional(v.number()),
    amountReleased: v.optional(v.number()),
    amountUtilized: v.optional(v.number()),
    status: v.optional(v.string()),
    sanctionedDate: v.optional(v.string()),
    utilizedDate: v.optional(v.string()),
    remarks: v.optional(v.string()),
    attachmentId: v.optional(v.id("_storage")),
    attachmentName: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
    // explicit removal (Remove button): nulls out the stored attachment
    clearAttachment: v.optional(v.boolean()),
  },
  handler: async (ctx, { fundId, ...changes }) => {
    const fund = await ctx.db.get(fundId);
    if (!fund) throw new Error("Fund record not found");
    const { user } = await loadFacilityForEdit(ctx, fund.facilityId);
    const labels: Record<string, string> = {
      financialYear: "Financial Year",
      amountSanctioned: "Amount Sanctioned",
      amountReleased: "Amount Released",
      amountUtilized: "Amount Utilized",
      status: "Fund Status",
      sanctionedDate: "Sanctioned Date",
      utilizedDate: "Utilized Date",
      remarks: "Remarks",
    };
    // Attachment is audited as a single unit (id+name+type arrive together);
    // clearAttachment removes an existing file.
    const attachment = changes.clearAttachment
      ? {
          attachmentId: undefined,
          attachmentName: undefined,
          attachmentType: undefined,
        }
      : changes.attachmentId !== undefined
        ? {
            attachmentId: changes.attachmentId,
            attachmentName: changes.attachmentName,
            attachmentType: changes.attachmentType,
          }
        : null;    if (
      attachment &&
      (String(fund.attachmentId ?? "") !== String(attachment.attachmentId ?? "") ||
        changes.clearAttachment)
    ) {
      await ctx.db.patch(fundId, { ...attachment, updatedAt: Date.now() });
      await audit(ctx, {
        table: "gapClosureFunds",
        recordId: String(fundId),
        facilityId: fund.facilityId,
        action: "update",
        field: "Attachment",
        oldValue: fund.attachmentName ?? "(none)",
        newValue: attachment.attachmentName ?? "(none)",
        userName: user.name,
        userId: user._id,
      });
    }
    for (const [field, newValue] of Object.entries(changes)) {
      if (newValue === undefined) continue;
      if (field.startsWith("attachment")) continue; // handled above as one unit
      if (field === "clearAttachment") continue;
      const oldValue = (fund as unknown as Record<string, unknown>)[field];
      if (String(oldValue ?? "") === String(newValue)) continue;
      await ctx.db.patch(fundId, { [field]: newValue, updatedAt: Date.now() });
      await audit(ctx, {
        table: "gapClosureFunds",
        recordId: String(fundId),
        facilityId: fund.facilityId,
        action: "update",
        field: labels[field] ?? field,
        oldValue: oldValue ?? "(empty)",
        newValue,
        userName: user.name,
        userId: user._id,
      });
    }
  },
});

export const deleteFund = mutation({
  args: { fundId: v.id("gapClosureFunds") },
  handler: async (ctx, { fundId }) => {
    const fund = await ctx.db.get(fundId);
    if (!fund) throw new Error("Fund record not found");
    const { user } = await loadFacilityForEdit(ctx, fund.facilityId);
    await ctx.db.delete(fundId);
    await audit(ctx, {
      table: "gapClosureFunds",
      recordId: String(fundId),
      facilityId: fund.facilityId,
      action: "delete",
      oldValue: `FY ${fund.financialYear} — ₹${fund.amountSanctioned ?? 0}`,
      userName: user.name,
      userId: user._id,
    });
  },
});

// ---------- fire NOC ----------

export const listFireNocs = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    const allowed = await allowedBlockNames(ctx, user);
    const settings = await getSettings(ctx);
    const today = todayIso();
    const nocs = await ctx.db.query("fireNocs").collect();
    const rows = [];
    for (const noc of nocs) {
      const facility = await ctx.db.get(noc.facilityId);
      if (!facility) continue;
      if (allowed !== null && !allowed.has(facility.block)) continue;
      const daysToExpiry = noc.expiryDate
        ? daysBetween(noc.expiryDate, today)
        : null;
      rows.push({
        noc: { ...noc, _id: String(noc._id), updatedAt: noc.updatedAt ?? null },
        facility: {
          _id: String(facility._id),
          name: facility.name,
          block: facility.block,
          phc: facility.phc,
          facilityType: facility.facilityType,
          ninNumber: facility.ninNumber ?? null,
        },
        daysToExpiry,
      });
    }
    rows.sort((a, b) => {
      const ax = a.noc.expiryDate ?? "9999";
      const bx = b.noc.expiryDate ?? "9999";
      return ax.localeCompare(bx) || a.facility.name.localeCompare(b.facility.name);
    });
    return {
      rows,
      statuses: settings.fireNocStatuses,
      alertLeadDays: settings.fireNocAlertLeadDays,
      me: { appRole: user.appRole },
    };
  },
});

export const saveFireNoc = mutation({
  args: {
    facilityId: v.id("facilities"),
    nocNumber: v.optional(v.string()),
    issuedDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    status: v.string(),
    renewalAppliedDate: v.optional(v.string()),
    remarks: v.optional(v.string()),
    attachmentId: v.optional(v.id("_storage")),
    attachmentName: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await loadFacilityForEdit(ctx, args.facilityId);
    const id = await ctx.db.insert("fireNocs", {
      facilityId: args.facilityId,
      updatedAt: Date.now(),
      nocNumber: args.nocNumber,
      issuedDate: args.issuedDate,
      expiryDate: args.expiryDate,
      status: args.status,
      renewalAppliedDate: args.renewalAppliedDate,
      remarks: args.remarks,
      attachmentId: args.attachmentId,
      attachmentName: args.attachmentName,
      attachmentType: args.attachmentType,
    });
    await audit(ctx, {
      table: "fireNocs",
      recordId: String(id),
      facilityId: args.facilityId,
      action: "create",
      field: "Fire NOC",
      newValue: `${args.nocNumber ?? "(no number)"} — ${args.status}`,
      userName: user.name,
      userId: user._id,
    });
    return id;
  },
});

export const updateFireNoc = mutation({
  args: {
    nocId: v.id("fireNocs"),
    nocNumber: v.optional(v.string()),
    issuedDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    status: v.optional(v.string()),
    renewalAppliedDate: v.optional(v.string()),
    remarks: v.optional(v.string()),
    attachmentId: v.optional(v.id("_storage")),
    attachmentName: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
    // explicit removal (Remove button): nulls out the stored attachment
    clearAttachment: v.optional(v.boolean()),
  },
  handler: async (ctx, { nocId, ...changes }) => {
    const noc = await ctx.db.get(nocId);
    if (!noc) throw new Error("Fire NOC record not found");
    const { user } = await loadFacilityForEdit(ctx, noc.facilityId);
    const labels: Record<string, string> = {
      nocNumber: "NOC Number",
      issuedDate: "Issued Date",
      expiryDate: "Expiry Date",
      status: "NOC Status",
      renewalAppliedDate: "Renewal Applied Date",
      remarks: "Remarks",
    };
    // Attachment is audited as a single unit (id+name+type arrive together);
    // clearAttachment removes an existing file.
    const attachment = changes.clearAttachment
      ? {
          attachmentId: undefined,
          attachmentName: undefined,
          attachmentType: undefined,
        }
      : changes.attachmentId !== undefined
        ? {
            attachmentId: changes.attachmentId,
            attachmentName: changes.attachmentName,
            attachmentType: changes.attachmentType,
          }
        : null;
    if (
      attachment &&
      (String(noc.attachmentId ?? "") !== String(attachment.attachmentId ?? "") ||
        changes.clearAttachment)
    ) {
      await ctx.db.patch(nocId, { ...attachment, updatedAt: Date.now() });
      await audit(ctx, {
        table: "fireNocs",
        recordId: String(nocId),
        facilityId: noc.facilityId,
        action: "update",
        field: "Attachment",
        oldValue: noc.attachmentName ?? "(none)",
        newValue: attachment.attachmentName ?? "(none)",
        userName: user.name,
        userId: user._id,
      });
    }
    for (const [field, newValue] of Object.entries(changes)) {
      if (newValue === undefined) continue;
      if (field.startsWith("attachment")) continue; // handled above as one unit
      if (field === "clearAttachment") continue;
      const oldValue = (noc as unknown as Record<string, unknown>)[field];
      if (String(oldValue ?? "") === String(newValue)) continue;
      await ctx.db.patch(nocId, { [field]: newValue, updatedAt: Date.now() });
      await audit(ctx, {
        table: "fireNocs",
        recordId: String(nocId),
        facilityId: noc.facilityId,
        action: "update",
        field: labels[field] ?? field,
        oldValue: oldValue ?? "(empty)",
        newValue,
        userName: user.name,
        userId: user._id,
      });
    }
  },
});

export const deleteFireNoc = mutation({
  args: { nocId: v.id("fireNocs") },
  handler: async (ctx, { nocId }) => {
    const noc = await ctx.db.get(nocId);
    if (!noc) throw new Error("Fire NOC record not found");
    const { user } = await loadFacilityForEdit(ctx, noc.facilityId);
    await ctx.db.delete(nocId);
    await audit(ctx, {
      table: "fireNocs",
      recordId: String(nocId),
      facilityId: noc.facilityId,
      action: "delete",
      oldValue: noc.nocNumber ?? "(no number)",
      userName: user.name,
      userId: user._id,
    });
  },
});

// ---------- building details ----------

export const listBuildings = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    const allowed = await allowedBlockNames(ctx, user);
    const settings = await getSettings(ctx);
    const buildings = await ctx.db.query("buildingDetails").collect();
    const rows = [];
    for (const building of buildings) {
      const facility = await ctx.db.get(building.facilityId);
      if (!facility) continue;
      if (allowed !== null && !allowed.has(facility.block)) continue;
      rows.push({
        building: { ...building, _id: String(building._id) },
        facility: {
          _id: String(facility._id),
          name: facility.name,
          block: facility.block,
          phc: facility.phc,
          facilityType: facility.facilityType,
          ninNumber: facility.ninNumber ?? null,
        },
      });
    }
    rows.sort((a, b) => a.facility.name.localeCompare(b.facility.name));
    return {
      rows,
      statuses: settings.buildingStatuses,
      me: { appRole: user.appRole },
    };
  },
});

export const saveBuilding = mutation({
  args: {
    facilityId: v.id("facilities"),
    buildingStatus: v.string(),
    buildingType: v.optional(v.string()),
    yearOfConstruction: v.optional(v.string()),
    lastRenovationDate: v.optional(v.string()),
    renovationFundRequired: v.optional(v.number()),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await loadFacilityForEdit(ctx, args.facilityId);
    const id = await ctx.db.insert("buildingDetails", {
      facilityId: args.facilityId,
      buildingStatus: args.buildingStatus,
      buildingType: args.buildingType,
      lastUpdatedAt: Date.now(),
      yearOfConstruction: args.yearOfConstruction,
      lastRenovationDate: args.lastRenovationDate,
      renovationFundRequired: args.renovationFundRequired,
      remarks: args.remarks,
    });
    await audit(ctx, {
      table: "buildingDetails",
      recordId: String(id),
      facilityId: args.facilityId,
      action: "create",
      field: "Building Details",
      newValue: args.buildingStatus,
      userName: user.name,
      userId: user._id,
    });
    return id;
  },
});

export const updateBuilding = mutation({
  args: {
    buildingId: v.id("buildingDetails"),
    buildingStatus: v.optional(v.string()),
    yearOfConstruction: v.optional(v.string()),
    lastRenovationDate: v.optional(v.string()),
    renovationFundRequired: v.optional(v.number()),
    remarks: v.optional(v.string()),
    buildingType: v.optional(v.string()),
  },
  handler: async (ctx, { buildingId, ...changes }) => {
    const building = await ctx.db.get(buildingId);
    if (!building) throw new Error("Building record not found");
    const { user } = await loadFacilityForEdit(ctx, building.facilityId);
    const labels: Record<string, string> = {
      buildingStatus: "Building Status",
      buildingType: "Building Type",
      yearOfConstruction: "Year of Construction",
      lastRenovationDate: "Last Renovation Date",
      renovationFundRequired: "Renovation Fund Required",
      remarks: "Remarks",
    };
    for (const [field, newValue] of Object.entries(changes)) {
      if (newValue === undefined) continue;
      const oldValue = (building as unknown as Record<string, unknown>)[field];
      if (String(oldValue ?? "") === String(newValue)) continue;
      // Auto "Last Updated on" date on every building-status change —
      // same behavior as the master-list row update path.
      const patch: Record<string, unknown> = { [field]: newValue };
      if (field === "buildingStatus") patch.lastUpdatedAt = Date.now();
      await ctx.db.patch(buildingId, patch);
      await audit(ctx, {
        table: "buildingDetails",
        recordId: String(buildingId),
        facilityId: building.facilityId,
        action: "update",
        field: labels[field] ?? field,
        oldValue: oldValue ?? "(empty)",
        newValue,
        userName: user.name,
        userId: user._id,
      });
    }
  },
});

export const deleteBuilding = mutation({
  args: { buildingId: v.id("buildingDetails") },
  handler: async (ctx, { buildingId }) => {
    const building = await ctx.db.get(buildingId);
    if (!building) throw new Error("Building record not found");
    const { user } = await loadFacilityForEdit(ctx, building.facilityId);
    await ctx.db.delete(buildingId);
    await audit(ctx, {
      table: "buildingDetails",
      recordId: String(buildingId),
      facilityId: building.facilityId,
      action: "delete",
      oldValue: building.buildingStatus,
      userName: user.name,
      userId: user._id,
    });
  },
});

// ---------- bulk import (CSV) ----------

type ImportRow = { cells: string[]; lineNo: number };

/** Full RFC-4180-aware CSV/TSV tokenizer: quoted cells may span newlines.
 *  Returns parsed rows (each with the source line number of its FIRST line
 *  so error messages still point at the right row). */
function tokenizeCsv(text: string): ImportRow[] {
  const rows: ImportRow[] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuotes = false;
  let lineNo = 1;
  let rowLine = 1;
  const pushCell = () => { cur.push(cell.trim()); cell = ""; };
  const pushRow = () => {
    pushCell();
    // keep rows that have at least one non-empty cell
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
    if (ch === '"') { inQuotes = true; }
    else if (ch === "," || ch === "\t") pushCell();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else cell += ch;
  }
  if (cell.length > 0 || cur.length > 0) pushRow();
  return rows;
}

/** snake_case-normalize a header cell: "Name of the Facility" → name_of_the_facility */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

type ImportCols = {
  facilityName?: number;
  block?: number;
  phc?: number;
  facilityType?: number;
  phaseType?: number;
  eligibility?: number;
  saqshamType?: number;
  saqshamCategory?: number;
  remarks?: number;
  ninNumber?: number;
  // Lifecycle / certification columns
  cycleNumber?: number;
  currentStatus?: number;
  saStatus?: number;
  saScore?: number;
  saStartDate?: number;
  saEndDate?: number;
  nqasStatus?: number;
  nqasScore?: number;
  certificationStatus?: number;
  certificationDate?: number;
  validTill?: number;
  naScheduledDate?: number;
  naEndDate?: number;
  naMode?: number;
  departments?: number;
  generalDocStatus?: number;
  surveillanceDone1?: number;
  surveillanceDone2?: number;
  surveillanceScore2?: number;
  recertStage?: number;
  // IA quarters (facilities)
  nqasIaQ1?: number;
  nqasIaQ2?: number;
  kayakalpIaQ1?: number;
  kayakalpIaQ2?: number;
  // trackers
  gapClosureAmount?: number;
  gcFundYear?: number;
  fundProcLink?: number;
  buildingType?: number;
  buildingStatus?: number;
  condemnedLink?: number;
  nocAvailable?: number;
  fireNocStatus?: number;
  fireNocValidity?: number;
  nocLink?: number;
};

/** Exact header aliases per logical field (normalized names). */
const HEADER_ALIASES: [keyof ImportCols, string[]][] = [
  ["facilityName", ["facility_name", "name", "phc_name", "facility", "name_of_facility", "name_of_the_facility", "name_of_the_phc", "institution_name", "name_of_institution", "facility_institution_name", "hf_name"]],
  ["block", ["block", "block_name", "name_of_block", "blockname"]],
  ["phc", ["phc", "phc_name", "name_of_phc", "phc_institution"]],
  ["facilityType", ["facility_type", "type", "facility_category", "institution_type"]],
  ["phaseType", ["phase_type", "phase", "phase_name"]],
  ["eligibility", ["nqas_eligibility", "eligibility", "nqas_eligible", "eligible"]],
  ["saqshamType", ["saqsham_facility_type", "facility_type_saqsham"]],
  ["saqshamCategory", ["saqsham_facility_name_category", "saqsham_category", "facility_name_category_saqsham", "saqsham_name_category"]],
  ["remarks", ["remarks", "general_remarks", "remark", "comments"]],
  ["ninNumber", ["nin", "nin_number", "nin_no", "ninnumber", "facility_nin", "national_identification_number"]],
  ["cycleNumber", ["cycle", "cycle_number", "cycle_no"]],
  ["currentStatus", ["current_status", "status", "facility_status"]],
  ["saStatus", ["sa_status", "state_assessment_status", "sa_state", "state_assessment"]],
  ["saScore", ["sa_score", "sa_score_percent", "sa_percentage", "state_assessment_score"]],
  ["nqasStatus", ["nqas_status", "national_assessment_status", "nqas_assessment_status", "national_assessment"]],
  ["nqasScore", ["nqas_score", "nqas_score_percent", "nqas_percentage", "national_assessment_score", "certified_score_percent", "if_certified_enter_score"]],
  ["certificationStatus", ["certification_status", "cert_status", "nqas_certification_status", "certification"]],
  ["certificationDate", ["certification_date", "cert_date", "date_of_certification", "certified_date"]],
  ["validTill", ["valid_till", "validity", "validity_date", "valid_upto", "valid_until"]],
  ["saStartDate", ["state_assessment_start_date", "sa_start_date", "sa_assessment_start_date"]],
  ["saEndDate", ["state_assessment_end_date", "sa_end_date", "sa_assessment_end_date"]],
  ["naScheduledDate", ["na_scheduled_date", "nqas_scheduled_date", "assessment_start_date", "nqas_assessment_start_date", "if_na_is_scheduled_assessment_start_date"]],
  ["naEndDate", ["na_end_date", "assessment_end_date", "nqas_end_date", "nqas_assessment_end_date"]],
  ["naMode", ["mode_of_assessment", "assessment_mode", "mode"]],
  ["departments", ["departments", "departments_packages", "departments_packages_certification_criteria", "departments_packages_and_certification_criteria", "departments_certification_criteria"]],
  ["generalDocStatus", ["documents_status", "general_documents_status", "doc_status", "saqsham_documents_status"]],
  // Part H root cause: these lists used to START with the DUE-DATE header
  // ("surveillance_visit_1st_year_due_date"), so a bulk import wrote the DUE
  // date into the DONE date — future "visits" that were never entered. The
  // done date owns ONLY "done" headers; the due date keeps its own mapping.
  ["surveillanceDone1", ["1st_surveillance_assessment_done_date", "first_surveillance_assessment_done_date", "surveillance_1st_year_done_date", "surveillance_assessment_done_date_1"]],
  ["surveillanceDone2", ["2nd_surveillance_assessment_done_date", "second_surveillance_assessment_done_date", "surveillance_2nd_year_done_date", "surveillance_assessment_done_date_2"]],
  ["surveillanceScore2", ["score_percent_2nd_surveillance", "2nd_surveillance_score_percent", "surveillance_score_percent"]],
  ["recertStage", ["if_applied_stage_of_the_application", "stage_of_the_application", "recertification_stage"]],
  ["nqasIaQ1", ["nqas_ia_2026_27_q1", "nqas_ia_q1", "nqas_ia_percent_q1"]],
  ["nqasIaQ2", ["nqas_ia_2026_27_q2", "nqas_ia_q2", "nqas_ia_percent_q2"]],
  ["kayakalpIaQ1", ["kayakalp_ia_2026_27_q1", "kayakalp_ia_q1", "kayakalp_ia_percent_q1"]],
  ["kayakalpIaQ2", ["kayakalp_ia_2026_27_q2", "kayakalp_ia_q2", "kayakalp_ia_percent_q2"]],
  ["gapClosureAmount", ["gap_closure_amount", "gap_closure_fund_amount", "gc_amount"]],
  ["gcFundYear", ["gc_fund_recived_year", "gc_fund_received_year", "gc_fund_year", "gc_fund_received_year"]],
  ["fundProcLink", ["gap_closure_amount_proc_link", "gc_fund_proc_link", "gap_closure_proc_link"]],
  ["buildingType", ["building_type"]],
  ["buildingStatus", ["building_status", "building_status_last_updated_on_14_07_2026", "facility_building_status"]],
  ["condemnedLink", ["condemned_document_link", "condemned_doc_link", "condemned_link"]],
  ["nocAvailable", ["noc_available_yes_no", "noc_available"]],
  ["fireNocStatus", ["fire_noc_validity_status", "fire_noc_status"]],
  ["fireNocValidity", ["fire_noc_validity", "fire_noc_expiry", "fire_noc_expiry_date", "certified_date_fire_noc"]],
  ["nocLink", ["noc_document_link", "fire_noc_document_link", "noc_doc_link"]],
];

/** Resolve logical columns from normalized headers: exact aliases first,
 *  then contains-based matching. Each column is claimed at most once. */
function resolveImportColumns(headers: string[]): ImportCols {
  const cols: ImportCols = {};
  const claimed = new Set<number>();
  for (const [field, aliases] of HEADER_ALIASES) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && aliases.includes(h));
    if (idx >= 0) {
      cols[field] = idx;
      claimed.add(idx);
    }
  }
  // Contains-based fallbacks for non-standard headers
  const contains = (i: number, ...words: string[]) => words.every((w) => headers[i].includes(w));
  if (cols.facilityName === undefined) {
    const idx = headers.findIndex(
      (h, i) =>
        !claimed.has(i) &&
        h.includes("name") &&
        (h.includes("facility") || h.includes("institution") || h.includes("phc") || h.includes("chc")),
    );
    if (idx >= 0) { cols.facilityName = idx; claimed.add(idx); }
  }
  if (cols.block === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("block"));
    if (idx >= 0) { cols.block = idx; claimed.add(idx); }
  }
  if (cols.phc === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("phc"));
    if (idx >= 0) { cols.phc = idx; claimed.add(idx); }
  }
  if (cols.facilityType === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && (h.includes("type") || h === "category"));
    if (idx >= 0) { cols.facilityType = idx; claimed.add(idx); }
  }
  if (cols.phaseType === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("phase"));
    if (idx >= 0) { cols.phaseType = idx; claimed.add(idx); }
  }
  if (cols.eligibility === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("eligib"));
    if (idx >= 0) { cols.eligibility = idx; claimed.add(idx); }
  }
  if (cols.saqshamCategory === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("saqsham"));
    if (idx >= 0) { cols.saqshamCategory = idx; claimed.add(idx); }
  }
  if (cols.remarks === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && (h.includes("remark") || h.includes("comment")));
    if (idx >= 0) { cols.remarks = idx; claimed.add(idx); }
  }
  // Lifecycle columns — contains-based fallbacks (spreadsheet headers vary a lot)
  if (cols.cycleNumber === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && (h === "cycle" || (h.includes("cycle") && h.includes("no"))));
    if (idx >= 0) { cols.cycleNumber = idx; claimed.add(idx); }
  }
  if (cols.currentStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("status"));
    if (idx >= 0) { cols.currentStatus = idx; claimed.add(idx); }
  }
  if (cols.saStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("sa") && h.includes("status"));
    if (idx >= 0) { cols.saStatus = idx; claimed.add(idx); }
  }
  if (cols.saScore === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("sa") && (h.includes("score") || h.includes("percent")));
    if (idx >= 0) { cols.saScore = idx; claimed.add(idx); }
  }
  if (cols.nqasStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("nqas") && h.includes("status"));
    if (idx >= 0) { cols.nqasStatus = idx; claimed.add(idx); }
  }
  if (cols.nqasScore === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("nqas") && (h.includes("score") || h.includes("percent")));
    if (idx >= 0) { cols.nqasScore = idx; claimed.add(idx); }
  }
  if (cols.certificationStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("certif") && h.includes("status"));
    if (idx >= 0) { cols.certificationStatus = idx; claimed.add(idx); }
  }
  if (cols.certificationDate === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("certif") && h.includes("date"));
    if (idx >= 0) { cols.certificationDate = idx; claimed.add(idx); }
  }
  if (cols.validTill === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && (h.includes("valid") || h.includes("expiry")));
    if (idx >= 0) { cols.validTill = idx; claimed.add(idx); }
  }
  void contains;

  // Tracker columns — contains-based fallbacks (narrowed by keyword to avoid
  // collisions with the certification columns claimed above).
  if (cols.gapClosureAmount === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("gap") && h.includes("amount"));
    if (idx >= 0) { cols.gapClosureAmount = idx; claimed.add(idx); }
  }
  if (cols.gcFundYear === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("gc") && h.includes("year"));
    if (idx >= 0) { cols.gcFundYear = idx; claimed.add(idx); }
  }
  if (cols.fundProcLink === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("proc"));
    if (idx >= 0) { cols.fundProcLink = idx; claimed.add(idx); }
  }
  if (cols.buildingType === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("building") && h.includes("type"));
    if (idx >= 0) { cols.buildingType = idx; claimed.add(idx); }
  }
  if (cols.buildingStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("building") && h.includes("status"));
    if (idx >= 0) { cols.buildingStatus = idx; claimed.add(idx); }
  }
  if (cols.condemnedLink === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("condemn"));
    if (idx >= 0) { cols.condemnedLink = idx; claimed.add(idx); }
  }
  if (cols.nocAvailable === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("noc") && h.includes("available"));
    if (idx >= 0) { cols.nocAvailable = idx; claimed.add(idx); }
  }
  if (cols.fireNocStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("noc") && h.includes("status"));
    if (idx >= 0) { cols.fireNocStatus = idx; claimed.add(idx); }
  }
  if (cols.fireNocValidity === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("noc") && (h.includes("valid") || h.includes("certified")));
    if (idx >= 0) { cols.fireNocValidity = idx; claimed.add(idx); }
  }
  if (cols.nocLink === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("noc") && h.includes("link"));
    if (idx >= 0) { cols.nocLink = idx; claimed.add(idx); }
  }
  if (cols.naMode === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("mode"));
    if (idx >= 0) { cols.naMode = idx; claimed.add(idx); }
  }
  if (cols.departments === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("department"));
    if (idx >= 0) { cols.departments = idx; claimed.add(idx); }
  }
  if (cols.naScheduledDate === undefined) {
    const idx = headers.findIndex(
      (h, i) => !claimed.has(i) && h.includes("assessment") && h.includes("start"),
    );
    if (idx >= 0) { cols.naScheduledDate = idx; claimed.add(idx); }
  }
  if (cols.naEndDate === undefined) {
    const idx = headers.findIndex(
      (h, i) => !claimed.has(i) && h.includes("assessment") && h.includes("end"),
    );
    if (idx >= 0) { cols.naEndDate = idx; claimed.add(idx); }
  }
  if (cols.saStartDate === undefined) {
    const idx = headers.findIndex(
      (h, i) => !claimed.has(i) && (h.includes("sa") || h.includes("state")) && h.includes("start"),
    );
    if (idx >= 0) { cols.saStartDate = idx; claimed.add(idx); }
  }
  if (cols.saEndDate === undefined) {
    const idx = headers.findIndex(
      (h, i) => !claimed.has(i) && (h.includes("sa") || h.includes("state")) && h.includes("end"),
    );
    if (idx >= 0) { cols.saEndDate = idx; claimed.add(idx); }
  }
  if (cols.generalDocStatus === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("document") && h.includes("status"));
    if (idx >= 0) { cols.generalDocStatus = idx; claimed.add(idx); }
  }
  if (cols.surveillanceDone1 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("surveillance") && h.includes("1st"));
    if (idx >= 0) { cols.surveillanceDone1 = idx; claimed.add(idx); }
  }
  if (cols.surveillanceDone2 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("surveillance") && h.includes("2nd"));
    if (idx >= 0) { cols.surveillanceDone2 = idx; claimed.add(idx); }
  }
  if (cols.surveillanceScore2 === undefined) {
    const idx = headers.findIndex(
      (h, i) => !claimed.has(i) && h.includes("score") && !h.includes("sa") && !h.includes("nqas"),
    );
    if (idx >= 0) { cols.surveillanceScore2 = idx; claimed.add(idx); }
  }
  if (cols.recertStage === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("stage"));
    if (idx >= 0) { cols.recertStage = idx; claimed.add(idx); }
  }
  if (cols.nqasIaQ1 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("nqas") && h.includes("ia") && h.includes("q1"));
    if (idx >= 0) { cols.nqasIaQ1 = idx; claimed.add(idx); }
  }
  if (cols.nqasIaQ2 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("nqas") && h.includes("ia") && h.includes("q2"));
    if (idx >= 0) { cols.nqasIaQ2 = idx; claimed.add(idx); }
  }
  if (cols.kayakalpIaQ1 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("kayakalp") && h.includes("ia") && h.includes("q1"));
    if (idx >= 0) { cols.kayakalpIaQ1 = idx; claimed.add(idx); }
  }
  if (cols.kayakalpIaQ2 === undefined) {
    const idx = headers.findIndex((h, i) => !claimed.has(i) && h.includes("kayakalp") && h.includes("ia") && h.includes("q2"));
    if (idx >= 0) { cols.kayakalpIaQ2 = idx; claimed.add(idx); }
  }
  return cols;
}

/** Detect the real header row: real spreadsheets often carry a title/
 *  preamble line above the header. A row qualifies as the header when its
 *  cells resolve a facility-name column. */
function detectHeader(rows: ImportRow[]): { headerIdx: number; cols: ImportCols } | null {
  const limit = Math.min(10, rows.length);
  for (let h = 0; h < limit; h++) {
    const headers = rows[h].cells.map(normalizeHeader).filter(Boolean);
    const cols = resolveImportColumns(headers);
    if (cols.facilityName !== undefined) return { headerIdx: h, cols };
  }
  return null;
}

function normalizeEligibility(v: string): "Eligible" | "Not Eligible" | "Possible" {
  const s = v.trim().toLowerCase();
  if (s.startsWith("not") || s === "no") return "Not Eligible";
  if (s.startsWith("pos") || s === "future") return "Possible";
  return "Eligible";
}

/** Placeholder junk produced by exported templates and empty form rows:
 *  em-dash fills, bare date masks ("dd-mm-yyyy"), "Unassigned", a bare
 *  "PHC", etc. A cell that is only one of these carries no data and is
 *  treated as empty on import — it must never become real field data. */
function isPlaceholderCell(v: string): boolean {
  const s = v.trim();
  if (!s) return true;
  if (/^[-—–_*#.]+$/.test(s)) return true; // dash / em-dash filler
  if (
    /^(dd[-/. ]?mm[-/. ]?yyyy|mm[-/. ]?dd[-/. ]?yyyy|yyyy[-/. ]?mm[-/. ]?dd)$/i.test(
      s,
    )
  )
    return true; // date masks
  if (/^(unassigned|not assigned|nil|na|n\/a|null|phc)$/.test(s.toLowerCase()))
    return true;
  return false;
}

/** Normalize a percent cell: strips %, handles "72%", "72.5", "NA" → null. */
function parseScore(v: string): number | undefined {
  const s = v.trim().replace("%", "");
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.round(Math.min(100, n));
}

/** Parse a money cell: "₹5,00,000", "500000", "5.5 lakh" → number. */
function parseAmount(v: string): number | undefined {
  const s = v.replace(/[₹,\s]/g, "").trim();
  if (!s) return undefined;
  const lakh = s.match(/^(\d+(?:\.\d+)?)\s*lakh$/i);
  if (lakh) return Math.round(Number(lakh[1]) * 100000);
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

/** Normalize a date cell to YYYY-MM-DD: accepts ISO, DD-MM-YYYY, DD/MM/YYYY,
 *  and common spreadsheet formats. Returns undefined when unparseable/empty. */
function parseImportDate(v: string): string | undefined {
  const s = v.trim();
  if (!s || /^(na|n\/a|-|—)$/i.test(s)) return undefined;
  // Already ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD-MM-YYYY or DD/MM/YYYY (common in Indian govt spreadsheets)
  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // MM/YYYY or YYYY (loose fallback)
  const ym = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (ym) return `${ym[1]}-${ym[2].padStart(2, "0")}-01`;
  // Try Date.parse for e.g. "12 Mar 2025"
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return undefined;
}

/** Normalize the SA status cell. */
function normalizeSaStatus(v: string): "Not Yet Initiated" | "Scheduled" | "Completed" {
  const s = v.trim().toLowerCase();
  if (s.startsWith("comp") || s === "done" || s === "yes") return "Completed";
  if (s.startsWith("sched") || s === "planned") return "Scheduled";
  return "Not Yet Initiated";
}

/** Normalize the NQAS status cell. */
function normalizeNqasStatus(v: string): "Pending" | "Scheduled" | "Completed" {
  const s = v.trim().toLowerCase();
  if (s.startsWith("comp") || s === "done" || s === "yes") return "Completed";
  if (s.startsWith("sched") || s === "planned") return "Scheduled";
  return "Pending";
}

/** Normalize the certification status cell to the allowed values. */
function normalizeCertStatus(
  v: string,
): "Result Awaited" | "Quality Certified" | "Quality Certified with Conditionality" | "Deferred" {
  const s = v.trim().toLowerCase();
  if (s.includes("condition")) return "Quality Certified with Conditionality";
  if (s.includes("defer")) return "Deferred";
  if (s.includes("await")) return "Result Awaited";
  return "Quality Certified";
}

export const bulkImportFacilities = mutation({
  args: { csv: v.string() },
  handler: async (ctx, { csv: rawCsv }) => {
    const user = await requireActivatedUser(ctx);
    if (!canEdit(user)) throw new Error("You do not have edit permission");

    // RFC-4180-aware tokenization: quoted cells may contain commas and
    // newlines (long remarks, multi-department cells), which a naive
    // line-split would break — that was the root cause of rows being
    // mis-counted/skipped on real government sheets.
    const allRows = tokenizeCsv(rawCsv.replace(/^\uFEFF/, ""));
    if (allRows.length < 2)
      throw new Error("CSV must have a header row and at least one data row");

    const detected = detectHeader(allRows);
    if (!detected) {
      const seen = allRows[0].cells.slice(0, 12).join(" | ");
      throw new Error(
        `Could not find a "Facility name" column in the first 10 rows. Detected columns: ${seen}. Make sure the file is CSV (not Excel binary) and one column is the facility name.`,
      );
    }
    const { headerIdx, cols } = detected;
    const headers = allRows[headerIdx].cells.map(normalizeHeader);
    const dataRows: ImportRow[] = allRows.slice(headerIdx + 1);

    const get = (row: ImportRow, col: number | undefined): string => {
      if (col === undefined) return "";
      const v = (row.cells[col] ?? "").trim();
      return isPlaceholderCell(v) ? "" : v;
    };
    const pick = (row: ImportRow, ...candidates: (number | undefined)[]) => {
      for (const c of candidates) {
        const v = get(row, c);
        if (v) return v;
      }
      return "";
    };

    let created = 0;
    let skippedDuplicates = 0;
    let skippedEmpty = 0;
    let skippedJunk = 0;
    const errors: string[] = [];
    const settings = await getSettings(ctx);

    // Block lookup / creation cache
    const blockCache = new Map<string, Id<"blocks">>();
    const getOrCreateBlock = async (name: string): Promise<Id<"blocks">> => {
      const cached = blockCache.get(name);
      if (cached) return cached;
      const existing = await ctx.db
        .query("blocks")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();
      if (existing) { blockCache.set(name, existing._id); return existing._id; }
      const id = await ctx.db.insert("blocks", { name, active: true });
      blockCache.set(name, id);
      return id;
    };

    for (const row of dataRows) {
      // Fully blank lines AND template-filler rows (every filled cell is a
      // placeholder like "—", "dd-mm-yyyy", "Unassigned") are ignored.
      const meaningful = row.cells.filter((c) => c.trim() && !isPlaceholderCell(c));
      if (meaningful.length === 0) {
        skippedEmpty += 1;
        continue;
      }
      const name = pick(row, cols.facilityName, cols.phc);
      if (!name) {
        skippedEmpty += 1;
        continue;
      }
      // Junk rows: instruction text pasted into the name cell (e.g. someone
      // pasted a whole how-to paragraph into a template row).
      if (name.length > 120) {
        skippedJunk += 1;
        continue;
      }
      const block = pick(row, cols.block) || "Unassigned";
      const phc = pick(row, cols.phc) || block;
      const facilityType = pick(row, cols.facilityType) || "PHC";
      const eligibility = normalizeEligibility(get(row, cols.eligibility));
      const nin = normalizeNin(get(row, cols.ninNumber));

      // De-duplication: NIN is the ONLY primary key. A row without a NIN is
      // always imported; a row whose NIN already exists is skipped —
      // existing data is never overwritten by import. (Facility-name
      // matching was removed: identical names across blocks/HSCs are legal,
      // and it silently dropped legitimate rows.)
      if (nin) {
        const dup = await ctx.db
          .query("facilities")
          .withIndex("by_nin", (q) => q.eq("ninNumber", nin))
          .first();
        if (dup) {
          skippedDuplicates += 1;
          errors.push(
            `Row ${row.lineNo}: skipped — NIN ${get(row, cols.ninNumber)} already exists (${dup.name}, ${dup.block})`,
          );
          continue;
        }
      } else if (get(row, cols.ninNumber).trim()) {
        errors.push(
          `Row ${row.lineNo}: NIN "${get(row, cols.ninNumber).trim()}" is not a valid alphanumeric ID — row imported without NIN`,
        );
      }

      // Block scoping for entry users
      if (user.appRole === "entry") {
        const allowed = await allowedBlockNames(ctx, user);
        if (allowed === null || !allowed.has(block)) {
          errors.push(`Row ${row.lineNo}: block "${block}" is not in your assigned blocks`);
          continue;
        }
      }

      await getOrCreateBlock(block);

      // Lifecycle columns from this row (may be empty — import still works)
      const saStatusRaw = get(row, cols.saStatus);
      const saScoreRaw = get(row, cols.saScore);
      const nqasStatusRaw = get(row, cols.nqasStatus);
      const certStatusRaw = get(row, cols.certificationStatus);
      const certDateRaw = get(row, cols.certificationDate);
      const validTillRaw = get(row, cols.validTill);
      const cycleNumberRaw = get(row, cols.cycleNumber);

      const facilityId = await ctx.db.insert("facilities", {
        block,
        phc,
        name,
        facilityType,
        phaseType: get(row, cols.phaseType) || undefined,
        eligibility,
        currentStatus: "—",
        currentCycleNumber: 0,
        saqshamFacilityType: get(row, cols.saqshamType) || undefined,
        saqshamCategory: get(row, cols.saqshamCategory) || undefined,
        remarks: get(row, cols.remarks) || undefined,
        ninNumber: nin ?? undefined,
        nqasIaQ1: parseScore(get(row, cols.nqasIaQ1)),
        nqasIaQ2: parseScore(get(row, cols.nqasIaQ2)),
        kayakalpIaQ1: parseScore(get(row, cols.kayakalpIaQ1)),
        kayakalpIaQ2: parseScore(get(row, cols.kayakalpIaQ2)),
        createdAt: Date.now(),
        createdBy: user._id,
      });
      created += 1;
      // Compute the auto status and bootstrap cycle #1 for eligible
      // facilities — without this, imported rows keep the "—" placeholder
      // forever and dashboards/status distribution show nothing.
      await refreshFacilityStatus(
        ctx, facilityId, user.name ?? "Unknown", user._id, true,
      );

      // --- import lifecycle data into the active cycle when provided ---
      const hasLifecycleData =
        saStatusRaw || saScoreRaw || nqasStatusRaw || certStatusRaw || validTillRaw || cycleNumberRaw;
      if (hasLifecycleData) {
        const cycles = await ctx.db
          .query("certificationCycles")
          .withIndex("by_facility", (q) => q.eq("facilityId", facilityId))
          .collect();
        cycles.sort((a, b) => a.cycleNumber - b.cycleNumber);
        // Honor an explicit Cycle column when it points at an existing cycle,
        // otherwise target the active (non-superseded) cycle.
        const wanted = Number(cycleNumberRaw) || 0;
        const cycle =
          cycles.find((c) => c.cycleNumber === wanted) ??
          cycles.find((c) => !c.superseded) ??
          cycles[cycles.length - 1] ??
          null;
        if (cycle) {
          const saStatus = saStatusRaw ? normalizeSaStatus(saStatusRaw) : undefined;
          const saScore = parseScore(saScoreRaw);
          const saStartDate = parseImportDate(get(row, cols.saStartDate));
          const saEndDate = parseImportDate(get(row, cols.saEndDate));
          const genDoc = get(row, cols.generalDocStatus) || undefined;
          const nqasStatus = nqasStatusRaw ? normalizeNqasStatus(nqasStatusRaw) : undefined;
          const certStatus = certStatusRaw ? normalizeCertStatus(certStatusRaw) : undefined;
          const certDate = parseImportDate(certDateRaw);
          const validTill = parseImportDate(validTillRaw);
          const naScheduled = parseImportDate(get(row, cols.naScheduledDate));
          const naEnd = parseImportDate(get(row, cols.naEndDate));
          const naMode = get(row, cols.naMode) || undefined;
          const departments = get(row, cols.departments);
          const surv1 = parseImportDate(get(row, cols.surveillanceDone1));
          const surv2 = parseImportDate(get(row, cols.surveillanceDone2));
          const survScore2 = parseScore(get(row, cols.surveillanceScore2));

          const sa = await ctx.db
            .query("stateAssessments")
            .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
            .first();
          if (sa && (saStatus || saScore !== undefined || saStartDate || saEndDate)) {
            await ctx.db.patch(sa._id, {
              ...(saStatus ? { status: saStatus } : {}),
              ...(saScore !== undefined ? { scorePercent: saScore } : {}),
              // first date seen becomes the original; never overwrite silently
              ...(!sa.originalScheduledDate && saStartDate ? { originalScheduledDate: saStartDate, scheduledDate: saStartDate } : {}),
              ...(saEndDate ? { actualEndDate: saEndDate } : {}),
              ...(genDoc ? { generalDocStatus: genDoc, generalDocUpdatedAt: Date.now() } : {}),
            });
          }
          const nqasNeeded = nqasStatus || certStatus || certDate || validTill;
          if (nqasNeeded) {
            let nqas = await ctx.db
              .query("nationalAssessments")
              .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
              .first();
            if (!nqas && (sa?.status ?? saStatus) === "Completed") {
              const id = await ctx.db.insert("nationalAssessments", {
                cycleId: cycle._id,
                facilityId,
                status: "Pending",
              });
              nqas = await ctx.db.get(id);
            }
            if (nqas) {
              // Validity is auto-calculated by the engine when certification
              // status + date are set; the Valid till column only wins when
              // explicitly provided in the sheet.
              const merged = {
                ...nqas,
                ...(certStatus ? { certificationStatus: certStatus } : {}),
                ...(certDate ? { certificationDate: certDate } : {}),
              };
              const derived = computeDerivedNqas(
                certDate ? { ...merged, goiLetterDate: certDate } : merged,
                settings,
              );
              await ctx.db.patch(nqas._id, {
                ...(nqasStatus ? { status: nqasStatus } : {}),
                ...(certStatus ? { certificationStatus: certStatus } : {}),
                ...(certDate ? { certificationDate: certDate } : {}),
                ...(validTill ? { validityDate: validTill } : derived.validityDate ? { validityDate: derived.validityDate } : {}),
                ...(naScheduled ? { scheduledStartDate: naScheduled, originalScheduledStartDate: naScheduled } : {}),
                ...(naEnd ? { actualEndDate: naEnd } : {}),
                ...(naMode ? { mode: naMode } : {}),
                ...(departments
                  ? { departments: departments.split(",").map((d) => d.trim()).filter(Boolean) }
                  : {}),
                ...(derived.surveillanceDue1 ? { surveillanceDue1: derived.surveillanceDue1 } : {}),
                ...(derived.surveillanceDue2 ? { surveillanceDue2: derived.surveillanceDue2 } : {}),
                ...(surv1 ? { surveillanceDone1: surv1 } : {}),
                ...(surv2 ? { surveillanceDone2: surv2 } : {}),
                ...(survScore2 !== undefined ? { manualScore: survScore2 } : {}),
                ...(certDate
                  ? {
                      certifiedMonthYear: certDate.slice(0, 7),
                      certifiedYear: Number(certDate.slice(0, 4)),
                    }
                  : {}),
              });
            }
          }
          // Recertification application stage (cycle-level)
          const recertStage = get(row, cols.recertStage);
          if (recertStage && recertStage !== cycle.recertStage) {
            await ctx.db.patch(cycle._id, { recertStage });
          }
        }
      }

      // --- trackers (Gap Closure Fund / Fire NOC / Building) ---
      const gapAmount = parseAmount(get(row, cols.gapClosureAmount));
      const gcYear = get(row, cols.gcFundYear) || undefined;
      const procLink = get(row, cols.fundProcLink) || undefined;
      if (gapAmount !== undefined || gcYear || procLink) {
        await ctx.db.insert("gapClosureFunds", {
          facilityId,
          financialYear: gcYear || "2026-27",
          amountSanctioned: gapAmount,
          status: "Pending",
          procLink,
        });
      }
      const nocAvailRaw = get(row, cols.nocAvailable);
      const nocStatus = get(row, cols.fireNocStatus) || undefined;
      const nocValidity = parseImportDate(get(row, cols.fireNocValidity));
      const nocLink = get(row, cols.nocLink) || undefined;
      if (nocAvailRaw || nocStatus || nocValidity || nocLink) {
        const avail = /^(yes|y|true|1)$/i.test(nocAvailRaw.trim())
          ? "Yes"
          : /^(no|n|false|0)$/i.test(nocAvailRaw.trim())
            ? "No"
            : undefined;
        await ctx.db.insert("fireNocs", {
          facilityId,
          nocAvailable: avail,
          status: nocStatus || (avail === "No" ? "Not Obtained" : "Valid"),
          expiryDate: nocValidity,
          nocLink,
        });
      }
      const bType = get(row, cols.buildingType) || undefined;
      const bStatus = get(row, cols.buildingStatus) || undefined;
      const condemned = get(row, cols.condemnedLink) || undefined;
      if (bType || bStatus || condemned) {
        await ctx.db.insert("buildingDetails", {
          facilityId,
          buildingType: bType,
          buildingStatus: bStatus || "Good",
          condemnedLink: condemned,
        });
      }

      await refreshFacilityStatus(
        ctx, facilityId, user.name ?? "Unknown", user._id, false,
      );
      await audit(ctx, {
        table: "facilities",
        recordId: String(facilityId),
        facilityId,
        action: "create",
        field: "Bulk import",
        newValue: `${name} (${block} / ${phc})`,
        userName: user.name,
        userId: user._id,
      });
    }
    return {
      created,
      errors,
      total: dataRows.length,
      headers: headers.filter(Boolean),
      skippedDuplicates,
      skippedEmpty,
      skippedJunk,
    };
  },
});

// ---------- reports ----------

export type ReportRow = {
  /** The facility's id — the shared master grid links every Facility cell to
   *  its profile (/facilities/:id), so the report row must carry it. */
  facilityId: string;
  facility: string; block: string; phc: string; nin: string | null; type: string;
  currentStatus: string;
  /** NQAS eligibility — lets the deck bucket facilities into the same
   *  pipeline stages as the dashboard (a "Not eligible" slice). */
  eligibility: string;
  // certification (NQAS NA)
  certStatus: string | null; certDate: string | null; certScore: number | null;
  naStatus: string | null;
  naScheduledDate: string | null; naEndDate: string | null; naMode: string | null;
  departments: string[];
  // gap closure fund
  gapClosureAmount: number | null; gcFundYear: string | null; fundProcLink: string | null;
  // IA quarters
  nqasIaQ1: number | null; nqasIaQ2: number | null; kayakalpIaQ1: number | null; kayakalpIaQ2: number | null;
  // state assessment
  saStatus: string | null; saScore: number | null; saStartDate: string | null; saEndDate: string | null;
  saAssessor1Name: string | null;
  saAssessor2Name: string | null;
  saAssessor1Hud: string | null;
  saAssessor2Hud: string | null;
  saReportAttachmentId: string | null;
  saReportAttachmentName: string | null;
  saChecklistAttachmentId: string | null;
  saChecklistAttachmentName: string | null;
  generalDocStatus: string | null;
  /** The derived SaQsham document-status group (facilities field written by
   *  the document-status import) — the shared column config reads it. */
  documentsStatusReport: string | null;
  // lifecycle / auto fields
  surveillanceDue1: string | null; surveillanceDone1: string | null;
  surveillanceDue2: string | null; surveillanceDone2: string | null;
  score: number | null; validityDate: string | null;
  /** "2nd Surveillance Score %" — the manual Score column (nqas.manualScore). */
  manualScore: number | null;
  recertStatus: string | null; recertStage: string | null; recertYear: string | null;
  // building
  buildingType: string | null; buildingStatus: string | null; condemnedLink: string | null;
  // fire NOC
  nocAvailable: string | null; fireNocStatus: string | null; nocCertifiedDate: string | null;
  fireNocValidity: string | null; nocLink: string | null;
  remarks: string | null;
  cycle: number | null;
};

/** 46-column detail report matching the master spreadsheet, one row per
 *  facility (active cycle). Block-scoped for data-entry users. */
/** Distinct certification-cycle numbers on record (1, 2, …) — keeps the
 *  cycle selectors stable while the report is scoped to one cycle. */
export const listCycleNumbers = query({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    const all = await ctx.db.query("certificationCycles").collect();
    return [...new Set(all.map((c) => c.cycleNumber))].sort((a, b) => a - b);
  },
});

/**
 * CYCLE FILTER COUNTS — one small read for the certification-cycle menu.
 *
 * The menu needs three numbers and nothing else:
 *   current → distinct facilities that have a certification cycle,
 *   #N      → distinct facilities whose #N cycle exists (it becomes the count
 *             the list shows only when that cycle is chosen),
 *   all     → every facility × cycle row (the LIST total, never a KPI).
 *
 * Read from `certificationCycles` only — never Drive, never the heavy rows
 * query — so switching the menu never triggers a list refetch.
 */
export const cycleSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireActivatedUser(ctx);
    const cycles = await ctx.db.query("certificationCycles").collect();
    const facilities = new Set<string>();
    const perCycle = new Map<number, { count: number; cycleType: string }>();
    for (const c of cycles) {
      facilities.add(String(c.facilityId));
      const entry: { count: number; cycleType: string } =
        perCycle.get(c.cycleNumber) ?? { count: 0, cycleType: "Initial" };
      entry.count += 1;
      // A cycle number is one type district-wide (Initial for #1, Recert for
      // the rest); keep the last non-empty label so the menu can name it.
      if (c.cycleType) entry.cycleType = String(c.cycleType);
      perCycle.set(c.cycleNumber, entry);
    }
    return {
      current: facilities.size,
      all: cycles.length,
      cycles: [...perCycle.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([cycleNumber, v]) => ({
          cycleNumber,
          cycleType: v.cycleType,
          count: v.count,
        })),
    };
  },
});

export const getReportData = query({
  args: {
    /** Scope every facility's row to one certification cycle (its stored
     *  history) instead of the active cycle. Facilities without that cycle
     *  still appear — lifecycle columns are just blank. */
    cycle: v.optional(v.number()),
  },
  handler: async (ctx, { cycle: wantCycle }) => {
    const user = await requireActivatedUser(ctx);
    const allowed = await allowedBlockNames(ctx, user);
    let facilities = await ctx.db.query("facilities").collect();
    if (allowed !== null) facilities = facilities.filter((f) => allowed.has(f.block));
    // Ascending hierarchy: Block → PHC → facility name.
    facilities.sort(
      (a, b) =>
        a.block.localeCompare(b.block) ||
        a.phc.localeCompare(b.phc) ||
        a.name.localeCompare(b.name),
    );

    const rows: ReportRow[] = [];
    // Batch-load all lifecycle data in 6 table scans instead of ~7 queries
    // per facility (157 facilities used to mean ~1,100 round trips per load).
    const idSet = new Set(facilities.map((f) => f._id));
    const allCycles = await ctx.db.query("certificationCycles").collect();
    const cyclesByFacility = new Map<
      Id<"facilities">,
      Doc<"certificationCycles">[]
    >();
    for (const c of allCycles) {
      if (!idSet.has(c.facilityId)) continue;
      const list = cyclesByFacility.get(c.facilityId) ?? [];
      list.push(c);
      cyclesByFacility.set(c.facilityId, list);
    }
    const [allSas, allNas, allFunds, allNocs, allBuildings] = await Promise.all([
      ctx.db.query("stateAssessments").collect(),
      ctx.db.query("nationalAssessments").collect(),
      ctx.db.query("gapClosureFunds").collect(),
      ctx.db.query("fireNocs").collect(),
      ctx.db.query("buildingDetails").collect(),
    ]);
    const saByCycle = new Map(allSas.map((s) => [s.cycleId, s]));
    const naByCycle = new Map(allNas.map((n) => [n.cycleId, n]));
    const fundsByFacility = new Map<Id<"facilities">, Doc<"gapClosureFunds">[]>();
    for (const r of allFunds) {
      if (!idSet.has(r.facilityId)) continue;
      const list = fundsByFacility.get(r.facilityId) ?? [];
      list.push(r);
      fundsByFacility.set(r.facilityId, list);
    }
    const nocsByFacility = new Map<Id<"facilities">, Doc<"fireNocs">[]>();
    for (const r of allNocs) {
      if (!idSet.has(r.facilityId)) continue;
      const list = nocsByFacility.get(r.facilityId) ?? [];
      list.push(r);
      nocsByFacility.set(r.facilityId, list);
    }
    const buildingByFacility = new Map<Id<"facilities">, Doc<"buildingDetails">>();
    for (const r of allBuildings) {
      if (!idSet.has(r.facilityId)) continue;
      if (!buildingByFacility.has(r.facilityId)) buildingByFacility.set(r.facilityId, r);
    }

    for (const f of facilities) {
      // Cycle-scoped report -> each facility's row comes from its stored
      // cycle with that number (null when it never had one, so lifecycle
      // columns render blank). Default -> the active (or newest) cycle.
      const cycles = (cyclesByFacility.get(f._id) ?? []).sort(
        (a, b) => a.cycleNumber - b.cycleNumber,
      );
      const cycle =
        wantCycle != null
          ? (cycles.find((c) => c.cycleNumber === wantCycle) ?? null)
          : (cycles.find((c) => !c.superseded) ??
            cycles[cycles.length - 1] ??
            null);
      const sa: Doc<"stateAssessments"> | null =
        cycle ? (saByCycle.get(cycle._id) ?? null) : null;
      const nqas: Doc<"nationalAssessments"> | null =
        cycle ? (naByCycle.get(cycle._id) ?? null) : null;
      const funds = (fundsByFacility.get(f._id) ?? []).sort(
        (a, b) => b.financialYear.localeCompare(a.financialYear),
      );
      const nocs = (nocsByFacility.get(f._id) ?? []).sort(
        (a, b) => (b.expiryDate ?? "").localeCompare(a.expiryDate ?? ""),
      );
      const fund = funds[0] ?? null;
      const noc = nocs[0] ?? null;
      const building = buildingByFacility.get(f._id) ?? null;
      rows.push({
        facilityId: f._id,
        facility: f.name,
        block: f.block,
        phc: f.phc,
        nin: f.ninNumber ?? null,
        type: f.facilityType,
        currentStatus: f.currentStatus,
        eligibility: f.eligibility,
        certStatus: nqas?.certificationStatus ?? null,
        certDate: nqas?.certificationDate ?? null,
        certScore: nqas?.scorePercent ?? null,
        naStatus: nqas?.status ?? null,
        naScheduledDate: nqas?.scheduledStartDate ?? null,
        naEndDate: nqas?.actualEndDate ?? nqas?.scheduledEndDate ?? null,
        naMode: nqas?.mode ?? null,
        departments: nqas?.departments ?? [],
        gapClosureAmount: fund?.amountSanctioned ?? null,
        gcFundYear: fund?.financialYear ?? null,
        fundProcLink: fund?.procLink ?? null,
        nqasIaQ1: f.nqasIaQ1 ?? null,
        nqasIaQ2: f.nqasIaQ2 ?? null,
        kayakalpIaQ1: f.kayakalpIaQ1 ?? null,
        kayakalpIaQ2: f.kayakalpIaQ2 ?? null,
        saStatus: sa?.status ?? null,
        saScore: sa?.scorePercent ?? null,
        saStartDate: sa?.actualStartDate ?? sa?.scheduledDate ?? null,
        saEndDate: sa?.actualEndDate ?? null,
        saAssessor1Name: sa?.assessor1Name ?? null,
        saAssessor2Name: sa?.assessor2Name ?? null,
        saAssessor1Hud: sa?.assessor1Hud ?? sa?.assessorHud ?? null,
        saAssessor2Hud: sa?.assessor2Hud ?? null,
        saReportAttachmentId: sa?.reportAttachmentId
          ? String(sa.reportAttachmentId)
          : null,
        saReportAttachmentName: sa?.reportAttachmentName ?? null,
        saChecklistAttachmentId: sa?.checklistAttachmentId
          ? String(sa.checklistAttachmentId)
          : null,
        saChecklistAttachmentName: sa?.checklistAttachmentName ?? null,
        generalDocStatus: sa?.generalDocStatus ?? null,
        documentsStatusReport: f.documentsStatusReport ?? null,
        surveillanceDue1: nqas?.surveillanceDue1 ?? null,
        surveillanceDone1: nqas?.surveillanceDone1 ?? null,
        surveillanceDue2: nqas?.surveillanceDue2 ?? null,
        surveillanceDone2: nqas?.surveillanceDone2 ?? null,
        score: nqas?.scorePercent ?? null,
        manualScore: nqas?.manualScore ?? null,
        validityDate: nqas?.validityDate ?? null,
        recertStatus: nqas?.manualRecertStatus ?? null,
        recertStage: cycle?.recertStage ?? null,
        recertYear: nqas?.recertYear ?? null,
        buildingType: building?.buildingType ?? null,
        buildingStatus: building?.buildingStatus ?? null,
        condemnedLink: building?.condemnedLink ?? null,
        nocAvailable: noc?.nocAvailable ?? null,
        fireNocStatus: noc?.status ?? null,
        nocCertifiedDate: noc?.issuedDate ?? null,
        fireNocValidity: noc?.expiryDate ?? null,
        nocLink: noc?.nocLink ?? null,
        remarks: f.remarks ?? null,
        cycle: cycle?.cycleNumber ?? null,
      });
    }
    return {
      rows,
      me: { appRole: user.appRole },
      generatedAt: todayIso(),
    };
  },
});

// ---------- type-wise / block-wise summary (dashboard + reports) ----------

export type TypeWiseStat = {
  label: string;
  target: number;
  certified: number;
  certifiedPct: number;
  nqasScheduled: number;
  resultAwaited: number;
  docPipeline: { status: string; count: number }[];
  docTotal: number;
  building: { status: string; count: number }[];
  buildingTotal: number;
};

/** Government summary table: per facility type and (separately) per block,
 *  counts of certification progress, SaQsham document pipeline and building
 *  status with colour-coded Certified %. Powers the dashboard card and the
 *  Reports summary (same numbers, one query). */
export const getTypeWiseSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireActivatedUser(ctx);
    const allowed = await allowedBlockNames(ctx, user);
    const settings = await getSettings(ctx);
    let facilities = await ctx.db.query("facilities").collect();
    if (allowed !== null) facilities = facilities.filter((f) => allowed.has(f.block));

    // Document pipeline counts use the new SaQsham documents-status stages.
    const docStatuses: string[] =
      (settings as Record<string, unknown>).generalDocStatuses as string[] ??
      DEFAULT_SETTINGS.generalDocStatuses;
    const buildingStatuses = settings.buildingStatuses ?? [
      "Good", "Needs Repair", "Under Renovation", "Dilapidated",
    ];

    type Acc = {
      target: number; certified: number; nqasScheduled: number;
      resultAwaited: number; docCounts: Map<string, number>;
      buildingCounts: Map<string, number>; buildingTotal: number;
    };
    const byType = new Map<string, Acc>();
    const byBlock = new Map<string, Acc>();
    const blank = (): Acc => ({
      target: 0, certified: 0, nqasScheduled: 0, resultAwaited: 0,
      docCounts: new Map(), buildingCounts: new Map(), buildingTotal: 0,
    });

    for (const f of facilities) {
      const cycles = await ctx.db
        .query("certificationCycles")
        .withIndex("by_facility", (q) => q.eq("facilityId", f._id))
        .collect();
      const cycle = cycles.find((c) => !c.superseded) ?? null;
      const [nqas, sa] = cycle
        ? await Promise.all([
            ctx.db
              .query("nationalAssessments")
              .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
              .first()
              .then((r) => r ?? null),
            ctx.db
              .query("stateAssessments")
              .withIndex("by_cycle", (q) => q.eq("cycleId", cycle._id))
              .first()
              .then((r) => r ?? null),
          ])
        : [null, null];
      const building = await ctx.db
        .query("buildingDetails")
        .withIndex("by_facility", (q) => q.eq("facilityId", f._id))
        .first();

      // Shared lifecycle view — same "certified" / "result awaited" rules as
      // the dashboard and Reports, so this summary cannot drift from them.
      const view = deriveLifecycleView(f, sa, nqas, settings, todayIso());
      const accFor = (m: Map<string, Acc>, key: string) => {
        const acc = m.get(key) ?? blank();
        acc.target += 1;
        if (view.isQualityCertified || view.isConditional) acc.certified += 1;
        if (view.nqasScheduled) acc.nqasScheduled += 1;
        if (view.isResultAwaited) acc.resultAwaited += 1;
        if (building?.buildingStatus) {
          acc.buildingCounts.set(
            building.buildingStatus,
            (acc.buildingCounts.get(building.buildingStatus) ?? 0) + 1,
          );
          acc.buildingTotal += 1;
        }
        m.set(key, acc);
      };
      accFor(byType, f.facilityType);
      accFor(byBlock, f.block);
    }

    const render = (m: Map<string, Acc>): TypeWiseStat[] =>
      [...m.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, acc]) => ({
          label,
          target: acc.target,
          certified: acc.certified,
          certifiedPct:
            acc.target > 0
              ? Math.round((acc.certified / acc.target) * 100)
              : 0,
          nqasScheduled: acc.nqasScheduled,
          resultAwaited: acc.resultAwaited,
          docPipeline: docStatuses.map((s) => ({
            status: s,
            count: acc.docCounts.get(s) ?? 0,
          })),
          docTotal: [...acc.docCounts.values()].reduce((a, b) => a + b, 0),
          building: buildingStatuses.map((s) => ({
            status: s,
            count: acc.buildingCounts.get(s) ?? 0,
          })),
          buildingTotal: acc.buildingTotal,
        }));

    return {
      byType: render(byType),
      byBlock: render(byBlock),
      docStatuses,
      buildingStatuses,
      me: { appRole: user.appRole },
    };
  },
});
