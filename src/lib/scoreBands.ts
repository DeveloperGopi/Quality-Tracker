/**
 * Assessment-score display bands.
 *
 * These are COLOUR HELPERS ONLY — never certification or pass/fail rules.
 * The numbers are always printed next to a bar, so colour is never the only
 * signal. Admin → Table & Display may change the three cut-offs.
 */

export type ScoreBandTone = "red" | "amber" | "teal" | "green";

export type ScoreBands = {
  /** Below this value = red. */
  below: number;
  /** At/above this and below `excellent` = amber. */
  satisfactory: number;
  /** At/above this = green. */
  excellent: number;
};

export const DEFAULT_SCORE_BANDS: ScoreBands = {
  below: 70,
  satisfactory: 80,
  excellent: 90,
};

export type ScoreBand = {
  id: "below" | "satisfactory" | "good" | "excellent";
  label: string;
  tone: ScoreBandTone;
  /** CSS background for a filled bar (light theme only). */
  colour: string;
};

const COLOURS: Record<ScoreBandTone, string> = {
  red: "#dc2626",
  amber: "#d97706",
  teal: "#0f766e",
  green: "#15803d",
};

/** Read a stored setting without letting a corrupt value break a page. */
export function readScoreBands(raw: unknown): ScoreBands {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const read = (key: keyof ScoreBands, fallback: number, min: number, max: number) => {
    const value = Number(source[key]);
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.min(max, Math.round(value * 10) / 10));
  };
  const below = read("below", DEFAULT_SCORE_BANDS.below, 0, 100);
  const satisfactory = Math.max(
    below,
    read("satisfactory", DEFAULT_SCORE_BANDS.satisfactory, 0, 100),
  );
  const excellent = Math.max(
    satisfactory,
    read("excellent", DEFAULT_SCORE_BANDS.excellent, 0, 100),
  );
  return { below, satisfactory, excellent };
}

export function scoreBandFor(
  value: number | null | undefined,
  bands: ScoreBands = DEFAULT_SCORE_BANDS,
): ScoreBand | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < bands.below) {
    return {
      id: "below",
      label: `Below ${formatCut(bands.below)}`,
      tone: "red",
      colour: COLOURS.red,
    };
  }
  if (value < bands.satisfactory) {
    return {
      id: "satisfactory",
      label: `${formatCut(bands.below)}–${formatCut(bands.satisfactory - 0.01)}`,
      tone: "amber",
      colour: COLOURS.amber,
    };
  }
  if (value < bands.excellent) {
    return {
      id: "good",
      label: `${formatCut(bands.satisfactory)}–${formatCut(bands.excellent - 0.01)}`,
      tone: "teal",
      colour: COLOURS.teal,
    };
  }
  return {
    id: "excellent",
    label: `${formatCut(bands.excellent)} and above`,
    tone: "green",
    colour: COLOURS.green,
  };
}

function formatCut(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Short delta wording with the shared 0.05 “no change” band. */
export function scoreChangeText(delta: number | null): string {
  if (delta == null || !Number.isFinite(delta)) return "-";
  if (Math.abs(delta) <= 0.05) return "No change";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(2)}`;
}
