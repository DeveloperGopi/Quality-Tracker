/**
 * REPORT ROWS — the Reports page's API rows → the shared MasterRow shape.
 *
 * The `modules.getReportData` rows are adapted ONCE here into the MasterRow
 * the shared master-grid engine (columns/cells/exports) reads. The page AND
 * the contract tests (scripts/reportsContract.test.ts) drive this identical
 * mapping, so there is no second ad-hoc adapter able to drift.
 */

import { type MasterRow } from "@/lib/masterColumns";

export type ReportRowLike = {
  facilityId: string;
  facility: string;
  block: string;
  phc: string;
  nin: string | null;
  type: string;
  currentStatus: string;
  eligibility: string;
  naStatus: string | null;
  certStatus: string | null;
  certDate: string | null;
  certScore: number | null;
  naScheduledDate: string | null;
  naEndDate: string | null;
  naMode: string | null;
  departments: string[];
  gapClosureAmount: number | null;
  gcFundYear: string | null;
  fundProcLink: string | null;
  nqasIaQ1: number | null;
  nqasIaQ2: number | null;
  kayakalpIaQ1: number | null;
  kayakalpIaQ2: number | null;
  saStatus: string | null;
  saScore: number | null;
  saStartDate: string | null;
  saEndDate: string | null;
  saAssessor1Name: string | null;
  saAssessor2Name: string | null;
  saAssessor1Hud: string | null;
  saAssessor2Hud: string | null;
  saReportAttachmentId: string | null;
  saReportAttachmentName: string | null;
  saChecklistAttachmentId: string | null;
  saChecklistAttachmentName: string | null;
  generalDocStatus: string | null;
  documentsStatusReport: string | null;
  surveillanceDue1: string | null;
  surveillanceDone1: string | null;
  surveillanceDue2: string | null;
  surveillanceDone2: string | null;
  manualScore: number | null;
  validityDate: string | null;
  recertStatus: string | null;
  recertStage: string | null;
  recertYear: string | null;
  buildingType: string | null;
  buildingStatus: string | null;
  condemnedLink: string | null;
  nocAvailable: string | null;
  fireNocStatus: string | null;
  nocCertifiedDate: string | null;
  fireNocValidity: string | null;
  nocLink: string | null;
  remarks: string | null;
  cycle: number | null;
};

/** Build the MasterRow the shared engine reads. */
export function reportRowToMasterRow(r: ReportRowLike): MasterRow {
  return {
    facility: {
      _id: r.facilityId,
      name: r.facility,
      block: r.block,
      phc: r.phc,
      facilityType: r.type,
      ninNumber: r.nin,
      eligibility: r.eligibility || null,
      currentStatus: r.currentStatus || null,
      statusOverride: null,
      remarks: r.remarks,
      documentsStatusReport: r.documentsStatusReport,
      saqshamStatusRaw: null,
      saqshamApplicationNo: null,
      saqshamPortalUpdatedOn: null,
      saqshamPortalUpdatedBy: null,
      updatedAt: null,
      nqasIaQ1: r.nqasIaQ1,
      nqasIaQ2: r.nqasIaQ2,
      kayakalpIaQ1: r.kayakalpIaQ1,
      kayakalpIaQ2: r.kayakalpIaQ2,
    },
    cycleNumber: r.cycle,
    cycleType: null,
    sa: {
      status: r.saStatus,
      actualStartDate: r.saStartDate,
      actualEndDate: r.saEndDate,
      scorePercent: r.saScore,
      generalDocStatus: r.generalDocStatus,
      assessor1Name: r.saAssessor1Name,
      assessor1Hud: r.saAssessor1Hud,
      assessor2Name: r.saAssessor2Name,
      assessor2Hud: r.saAssessor2Hud,
      reportAttachmentId: r.saReportAttachmentId,
      reportAttachmentName: r.saReportAttachmentName,
      checklistAttachmentId: r.saChecklistAttachmentId,
      checklistAttachmentName: r.saChecklistAttachmentName,
    },
    nqas: {
      status: r.naStatus,
      scheduledStartDate: r.naScheduledDate,
      actualEndDate: r.naEndDate,
      mode: r.naMode,
      departments: r.departments,
      scorePercent: r.certScore,
      certificationStatus: r.certStatus,
      certificationDate: r.certDate,
      goiLetterDate: null,
      validityDate: r.validityDate,
      surveillanceDue1: r.surveillanceDue1,
      surveillanceDone1: r.surveillanceDone1,
      surveillanceDue2: r.surveillanceDue2,
      surveillanceDone2: r.surveillanceDone2,
      manualScore: r.manualScore,
      recertStatus: r.recertStatus,
      recertYear: r.recertYear,
    },
    fund: {
      amountSanctioned: r.gapClosureAmount,
      financialYear: r.gcFundYear,
      procLink: r.fundProcLink,
      status: null,
    },
    noc: {
      nocAvailable: r.nocAvailable,
      status: r.fireNocStatus,
      issuedDate: r.nocCertifiedDate,
      expiryDate: r.fireNocValidity,
      nocLink: r.nocLink,
      nocAttachmentId: null,
      nocAttachmentName: null,
    },
    building: {
      buildingType: r.buildingType,
      buildingStatus: r.buildingStatus,
      condemnedLink: r.condemnedLink,
    },
    ia: null,
    resultDocumentId: null,
    resultDocumentName: null,
  };
}

/** Adapt a full page of API rows. */
export function buildReportRows(rows: readonly ReportRowLike[]): MasterRow[] {
  return rows.map(reportRowToMasterRow);
}
