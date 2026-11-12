/**
 * PROFILE → SHEET ROW — one adapter, so the Facility Profile page prints the
 * SAME two-page sheet as the Master List and the Quick View.
 *
 * The profile page holds raw records (facility doc, cycle details, funds,
 * NOCs, buildings, quarterly IA rows) while the sheet reads a `MasterRow`.
 * The mapping below is deliberately the mirror of
 * `ops.listFacilityRowsFast` (src/convex/ops.ts): active cycle, the same
 * derived Fire NOC status, the same quarterly IA store. That is why a sheet
 * printed from the profile can never disagree with the list or Quick View.
 */

import { deriveFireNocStatus } from "@/convex/lifecycle";
import {
  attachIaExtras,
  buildIaMasterIndex,
  facilityIaPair,
  withLegacyIa,
} from "@/lib/iaMaster";
import type { IaStoredQuarter } from "@/lib/iaImport";
import type { MasterRow } from "@/lib/masterColumns";
import { departmentsForFacility } from "@/lib/departments";

type Doc = Record<string, unknown>;

const str = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};
const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export type ProfileSheetCycle = {
  cycle: { cycleNumber: number; cycleType: string; superseded?: boolean | null };
  sa: Doc | null;
  nqas: Doc | null;
};

export type ProfileIaQuarter = {
  fy: string;
  quarter: number;
  nqasIaScore?: number | null;
  kayakalpIaScore?: number | null;
  ecoFriendlyScore?: number | null;
  nqasRemark?: string | null;
  kayakalpRemark?: string | null;
  ecoRemark?: string | null;
  lockedAt?: number | null;
  updatedAt?: number;
};

export type ProfileSheetInput = {
  facility: Doc;
  cycles: ProfileSheetCycle[];
  funds?: Doc[];
  nocs?: Doc[];
  buildings?: Doc[];
  /** `ia.listFacilityIaQuarters` rows — the quarterly IA store. */
  iaQuarters?: ProfileIaQuarter[];
  /** The SAME document metadata the Documents card reads, so the sheet can
   *  print the original name and upload date (never a storage name). */
  documents?: {
    key: string;
    originalName?: string | null;
    uploadedAt?: number | null;
    requirement?: { required: boolean; blocking: boolean; badge: string; reason: string | null } | null;
  }[];
  requiredMissing?: { key: string; label: string; blocking: boolean }[];
  /** ISO date used for the IA compare pair (defaults to today). */
  today?: string;
  /** Admin fire-NOC alert window (defaults to 90 like the list). */
  fireNocAlertLeadDays?: number | null;
};

/**
 * Build the MasterRow the sheet renders. Optional sections keep the sheet's
 * blank-collapsing rules working: a facility with no fund record still gets
 * `fund: null` and the card simply reports "Not recorded".
 */
export function masterRowFromProfile(input: ProfileSheetInput): MasterRow {
  const f = input.facility;
  const currentCycleNumber = num(f.currentCycleNumber);
  const cycles = [...(input.cycles ?? [])].sort(
    (a, b) => a.cycle.cycleNumber - b.cycle.cycleNumber,
  );
  const active =
    (currentCycleNumber
      ? cycles.find((c) => c.cycle.cycleNumber === currentCycleNumber)
      : undefined) ??
    cycles.find((c) => !c.cycle.superseded) ??
    cycles[cycles.length - 1] ??
    null;
  const sa = active?.sa ?? null;
  const nqas = active?.nqas ?? null;

  const funds = [...(input.funds ?? [])].sort((a, b) =>
    String(b.financialYear ?? "").localeCompare(String(a.financialYear ?? "")),
  );
  const nocs = [...(input.nocs ?? [])].sort((a, b) =>
    String(b.expiryDate ?? "").localeCompare(String(a.expiryDate ?? "")),
  );
  const fund = funds[0] ?? null;
  const noc = nocs[0] ?? null;
  const building = (input.buildings ?? [])[0] ?? null;

  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const lead =
    input.fireNocAlertLeadDays == null ? undefined : Number(input.fireNocAlertLeadDays);

  /* Quarterly IA: same index + pair the Master List builds, so Athanavur's
     Q2 83.8 / 83.9 show up instead of the legacy blank Q1/Q2 columns. */
  const iaRows = input.iaQuarters ?? [];
  let iaq: MasterRow["iaq"] = undefined;
  {
    const index = buildIaMasterIndex(
      iaRows.map(
        (r) =>
          ({
            facilityId: String(f._id),
            fy: r.fy,
            quarter: r.quarter,
            nqasIaScore: r.nqasIaScore ?? null,
            kayakalpIaScore: r.kayakalpIaScore ?? null,
            ecoFriendlyScore: r.ecoFriendlyScore ?? null,
            nqasRemark: r.nqasRemark ?? null,
            kayakalpRemark: r.kayakalpRemark ?? null,
            ecoRemark: r.ecoRemark ?? null,
            lockedAt: r.lockedAt ?? null,
            updatedAt: r.updatedAt ?? 0,
          }) as IaStoredQuarter,
      ),
    );
    withLegacyIa(index, [
      {
        id: String(f._id),
        nqasIaQ1: num(f.nqasIaQ1),
        kayakalpIaQ1: num(f.kayakalpIaQ1),
        nqasIaQ2: num(f.nqasIaQ2),
        kayakalpIaQ2: num(f.kayakalpIaQ2),
      },
    ]);
    // This facility's OWN latest + previous quarter with data — never a
    // fleet-wide or calendar-quarter guess.
    const pair = facilityIaPair(index, String(f._id));
    if (pair) iaq = attachIaExtras(String(f._id), index, pair);
  }

  /* Documents: one entry per present file. The profile page passes the live
     list (name + date + rule), so the sheet's card can say "Uploaded
     25-Sep-2026 · C2_Kurumbakeri HSC.pdf" instead of just "Uploaded". */
  const docFiles: Record<string, { name: string; uploadedAt: number }> = {};
  const docRequirements: Record<string, { required: boolean; blocking: boolean; badge: string; reason: string | null }> = {};
  const docKeys = new Set<string>();
  for (const d of input.documents ?? []) {
    // The live document list is authoritative about WHICH files exist; a
    // legacy row without metadata still counts, it just prints "Uploaded".
    docKeys.add(d.key === "NQAS_Certificate" ? "NQAS_Result" : d.key);
    if (d.originalName && d.uploadedAt != null) {
      docFiles[d.key] = { name: d.originalName, uploadedAt: d.uploadedAt };
    }
    if (d.requirement) docRequirements[d.key] = d.requirement;
  }
  // No live list (a hand-built profile record) — read the same attachment
  // fields the Master List's legacy fallback reads.
  if (!input.documents) {
    if (str(nqas?.resultDocumentName)) docKeys.add("NQAS_Result");
    if (str(sa?.reportAttachmentName)) docKeys.add("SA_Report");
    if (str(sa?.checklistAttachmentName)) docKeys.add("SA_Checklist");
    if (str(fund?.procLink) || str(fund?.attachmentName)) docKeys.add("Gap_Closure");
    if (str(building?.condemnedLink) || str(building?.condemnedAttachmentName)) docKeys.add("Condemned");
    if (str(noc?.attachmentName) || str(noc?.nocLink)) docKeys.add("NOC");
  }

  /* HWC HSC → the 12 service packages; other types → departments. */
  const departmentOptions = departmentsForFacility(
    input.facility.facilityType as string | null | undefined,
    [
      "OPD",
      "Labour Room",
      "OT",
      "Lab",
      "Pharmacy",
      "Emergency",
      "Ward",
      "Immunization",
    ],
  );

  return {
    facility: {
      ...(f as unknown as MasterRow["facility"]),
      _id: String(f._id),
      name: str(f.name) ?? "",
      block: str(f.block) ?? "",
      phc: str(f.phc) ?? "",
      facilityType: str(f.facilityType) ?? "",
      ninNumber: str(f.ninNumber),
      eligibility: str(f.eligibility),
      currentStatus: str(f.currentStatus),
      remarks: str(f.remarks),
      updatedAt: num(f.updatedAt),
    },
    cycleNumber: active?.cycle.cycleNumber ?? null,
    cycleType: active?.cycle.cycleType ?? null,
    resultDocumentName: str(nqas?.resultDocumentName),
    resultDocumentUpdatedAt: num(nqas?.resultDocumentUpdatedAt),
    recertStage: (active?.cycle as { recertStage?: string | null } | undefined)?.recertStage ?? null,
    iaq,
    sa: sa
      ? {
          status: str(sa.status),
          scheduledDate: str(sa.scheduledDate),
          revisedDate: str(sa.revisedDate),
          actualStartDate: str(sa.actualStartDate),
          actualEndDate: str(sa.actualEndDate),
          scorePercent: num(sa.scorePercent),
          generalDocStatus: str(sa.generalDocStatus),
          assessor1Name: str(sa.assessor1Name),
          assessor1Hud: str(sa.assessor1Hud) ?? str(sa.assessorHud),
          assessor2Name: str(sa.assessor2Name),
          assessor2Hud: str(sa.assessor2Hud),
          reportAttachmentId: str(sa.reportAttachmentId),
          reportAttachmentName: str(sa.reportAttachmentName),
          checklistAttachmentId: str(sa.checklistAttachmentId),
          checklistAttachmentName: str(sa.checklistAttachmentName),
        }
      : null,
    nqas: nqas
      ? {
          status: str(nqas.status),
          scheduledStartDate: str(nqas.scheduledStartDate),
          scheduledEndDate: str(nqas.scheduledEndDate),
          actualEndDate: str(nqas.actualEndDate),
          mode: str(nqas.mode),
          departments: Array.isArray(nqas.departments)
            ? (nqas.departments as string[])
            : null,
          departmentOptions,
          departmentsTotal: departmentOptions.length,
          scorePercent: num(nqas.scorePercent),
          certificationStatus: str(nqas.certificationStatus),
          certificationDate: str(nqas.certificationDate),
          goiLetterDate: str(nqas.goiLetterDate),
          validityDate: str(nqas.validityDate),
          surveillanceDue1: str(nqas.surveillanceDue1),
          surveillanceDone1: str(nqas.surveillanceDone1),
          surveillanceDue2: str(nqas.surveillanceDue2),
          surveillanceDone2: str(nqas.surveillanceDone2),
          manualScore: num(nqas.manualScore),
          recertStatus: str(nqas.manualRecertStatus),
          recertYear: num(nqas.recertYear),
        }
      : null,
    docs: {
      uploaded: docKeys.size,
      total: 6,
      keys: [...docKeys],
      files: Object.keys(docFiles).length ? docFiles : null,
      requirements: Object.keys(docRequirements).length ? docRequirements : null,
      requiredMissing: input.requiredMissing ?? [],
    },
    fund: fund
      ? {
          amountSanctioned: num(fund.amountSanctioned),
          amountReleased: num(fund.amountReleased),
          amountUtilized: num(fund.amountUtilized),
          financialYear: str(fund.financialYear),
          procLink: str(fund.procLink),
          fundAttachmentId: str(fund.attachmentId),
          fundAttachmentName: str(fund.attachmentName),
          updatedAt: num(fund.updatedAt),
          status: str(fund.status),
        }
      : null,
    noc: noc
      ? {
          nocAvailable: str(noc.nocAvailable),
          status: deriveFireNocStatus(
            str(noc.nocAvailable),
            str(noc.expiryDate),
            str(noc.status),
            today,
            lead,
          ),
          issuedDate: str(noc.issuedDate),
          expiryDate: str(noc.expiryDate),
          nocLink: str(noc.nocLink),
          nocAttachmentId: str(noc.attachmentId),
          nocAttachmentName: str(noc.attachmentName),
          updatedAt: num(noc.updatedAt),
        }
      : null,
    building: building
      ? {
          buildingType: str(building.buildingType),
          buildingStatus: str(building.buildingStatus),
          lastUpdatedAt: num(building.lastUpdatedAt),
          condemnedLink: str(building.condemnedLink),
          condemnedAttachmentId: str(building.condemnedAttachmentId),
          condemnedAttachmentName: str(building.condemnedAttachmentName),
        }
      : null,
  } as MasterRow;
}
