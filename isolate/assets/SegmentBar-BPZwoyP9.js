import './vendor-motion-DgC1stbS.js';

const SEGMENT_COLORS = {
  certified: "oklch(0.62 0.15 165)",
  conditional: "oklch(0.78 0.14 85)",
  inProgress: "oklch(0.58 0.14 250)",
  deferred: "oklch(0.6 0.2 25)",
  dueSoon: "oklch(0.72 0.16 60)",
  notStarted: "oklch(0.62 0.03 260)"
};
const PIPELINE_STAGE_COLORS = {
  notEligible: "oklch(0.72 0.02 260)",
  notStarted: SEGMENT_COLORS.notStarted,
  // Internal Assessment runs before the SA visit — violet keeps it distinct
  // from the blue State Assessment bucket that follows it.
  internalAssessment: "oklch(0.58 0.14 300)",
  stateAssessment: SEGMENT_COLORS.inProgress,
  naScheduled: "oklch(0.62 0.13 220)",
  resultAwaited: SEGMENT_COLORS.dueSoon,
  certified: SEGMENT_COLORS.certified
};

export { PIPELINE_STAGE_COLORS as P, SEGMENT_COLORS as S };
