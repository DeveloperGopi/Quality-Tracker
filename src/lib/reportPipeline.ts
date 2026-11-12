/**
 * PIPELINE BUCKETS — every facility lands in EXACTLY ONE of these, so the
 * summary's Pipeline reconciliation always sums to the facilities in scope.
 *
 * The old summary counted a facility in an NQAS/result zone column AND in a
 * document-stage column (or in neither when a certified facility's automatic
 * "Result Declared" was not in the admin list). That is the 18/157 failure.
 * The fix adds the two real buckets — Result declared and Not recorded — and
 * one explicit remainder, and classifies each facility once by priority.
 *
 * Labels are DISPLAY ONLY: the stored certification statuses and document
 * statuses are never renamed.
 */

import type { FlatLifecycleView } from "@/convex/lifecycle";
import { isResultDeclared, isResultDeclaredStatus } from "@/lib/resultDeclared";

export const RESULT_DECLARED_BUCKET = "Result declared";
export const NOT_RECORDED_BUCKET = "Not recorded";
export const NOT_IN_PIPELINE_BUCKET = "Not in pipeline";
export const NQAS_SCHEDULED_BUCKET = "NQAS Scheduled";
export const RESULT_AWAITED_BUCKET = "Result awaited";
export const NEXT_PHASE_BUCKET = "Next Phase";

/** The two document statuses duplicated by a dedicated lifecycle column. */
export const LEGACY_DOC_STATUSES = [
  "NA Scheduled",
  "NA Completed & Awaiting Results",
] as const;

export type PipelinePlacementKind =
  | "resultDeclared"
  | "zone"
  | "doc"
  | "notRecorded"
  | "notInPipeline";

export type PipelinePlacement = {
  /** The column label this facility is counted under (exactly one). */
  bucket: string;
  kind: PipelinePlacementKind;
  /** Only for kind "doc": the stored admin status (column key). */
  docStatus?: string;
};

/** Admin document statuses that get their own pipeline column. */
export function docColumnStatuses(all: readonly string[]): string[] {
  return all.filter(
    (s) =>
      !!String(s).trim() &&
      !(LEGACY_DOC_STATUSES as readonly string[]).includes(s),
  );
}

/**
 * The ONE placement rule. Priority is furthest-first:
 *   declared result → NQAS scheduled → result awaited → next phase →
 *   a real document stage → Not recorded → Not in pipeline.
 * A facility is never counted twice, and the remainder exists for data the
 * admin list does not know about (never silently dropped).
 */
export function classifyPipeline(input: {
  view: Pick<
    FlatLifecycleView,
    | "nqasScheduled"
    | "isResultAwaited"
    | "isQualityCertified"
    | "isConditional"
    | "isDeferred"
  >;
  saStatus: string | null | undefined;
  docStatus: string | null | undefined;
  /** Admin document stages that own a column (already legacy-filtered). */
  docStatuses: readonly string[];
  certificationStatus?: string | null;
}): PipelinePlacement {
  const rawDoc = String(input.docStatus ?? "").trim();
  const docSet = new Set(input.docStatuses);

  if (
    isResultDeclaredStatus(input.certificationStatus) ||
    input.view.isQualityCertified ||
    input.view.isConditional ||
    input.view.isDeferred ||
    isResultDeclared(rawDoc)
  ) {
    return { bucket: RESULT_DECLARED_BUCKET, kind: "resultDeclared" };
  }

  const saTouched = input.saStatus === "Scheduled" || input.saStatus === "Completed";
  if (input.view.nqasScheduled && saTouched) {
    return { bucket: NQAS_SCHEDULED_BUCKET, kind: "zone" };
  }
  if (input.view.isResultAwaited || rawDoc === "NA Completed & Awaiting Results") {
    return { bucket: RESULT_AWAITED_BUCKET, kind: "zone" };
  }
  if (input.saStatus === "Completed") {
    return { bucket: NEXT_PHASE_BUCKET, kind: "zone" };
  }
  if (rawDoc && docSet.has(rawDoc)) {
    return { bucket: rawDoc, kind: "doc", docStatus: rawDoc };
  }
  if (!rawDoc || rawDoc.toLowerCase() === NOT_RECORDED_BUCKET.toLowerCase()) {
    return { bucket: NOT_RECORDED_BUCKET, kind: "notRecorded" };
  }
  return { bucket: NOT_IN_PIPELINE_BUCKET, kind: "notInPipeline" };
}

/** Display label for a document-stage column: "Docx in RQAU login" → "Docs in…".
 *  The stored value stays "Docx…" — only the label changes. */
export function docStageLabel(status: string): string {
  return String(status ?? "")
    .replace(/\bDocx\b/g, "Docs")
    .replace(/\bDocuments Pending\b/g, "Docs Pending")
    .replace(/\bDocument in\b/g, "Docs in")
    .replace(/\bDocument forwarded\b/g, "Docs forwarded")
    .replace(/\s+/g, " ")
    .trim();
}

/** The standard order of the pipeline group's columns. */
export function pipelineColumnLabels(docStatuses: readonly string[]): string[] {
  return [
    NQAS_SCHEDULED_BUCKET,
    RESULT_AWAITED_BUCKET,
    ...docStatuses.map(docStageLabel),
    RESULT_DECLARED_BUCKET,
    NOT_RECORDED_BUCKET,
    NEXT_PHASE_BUCKET,
    NOT_IN_PIPELINE_BUCKET,
  ];
}
