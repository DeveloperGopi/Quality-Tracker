/**
 * BREAKDOWN URL STATE — the "Progress breakdown" card's control state
 * (dimension, view, count/share, sort, denominator) synced with the URL
 * search params (?bdDim=…&bdView=…) and persisted per user in the session
 * (URL wins when both exist, so a copied link always opens what it says).
 *
 * The DASHBOARD owns this state (the breakdown is rebuilt from
 * `buildBreakdown` when the dimension changes), and the card renders as a
 * controlled component with it. Deep links `#progress-by-block` and
 * `#facility-type-summary` steer the dimension on first mount.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import {
  type BreakdownDimension,
  type BreakdownSortId,
  type BreakdownView,
} from "@/lib/breakdown";

export type BreakdownUrlState = {
  dim: BreakdownDimension;
  view: BreakdownView;
  mode: "count" | "share";
  sort: BreakdownSortId;
  denom: "all" | "eligible";
};

export const DEFAULT_BREAKDOWN_STATE: BreakdownUrlState = {
  dim: "block",
  view: "bars",
  mode: "count",
  sort: "rateDesc",
  denom: "all",
};

const PARAMS: Record<keyof BreakdownUrlState, string> = {
  dim: "bdDim",
  view: "bdView",
  mode: "bdMode",
  sort: "bdSort",
  denom: "bdDenom",
};

const SESSION_KEY = "nqas.breakdown.state";

function readSession(): Partial<BreakdownUrlState> {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "{}") as Partial<BreakdownUrlState>;
  } catch {
    return {};
  }
}

function writeSession(state: BreakdownUrlState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    /* private mode — the URL still carries it */
  }
}

/** URL params over session defaults — same validation as defaults. */
function resolve(session: Partial<BreakdownUrlState>, params: URLSearchParams): BreakdownUrlState {
  const s: BreakdownUrlState = { ...DEFAULT_BREAKDOWN_STATE, ...session };
  const dim = params.get(PARAMS.dim);
  if (dim === "block" || dim === "type" || dim === "phc") s.dim = dim;
  const view = params.get(PARAMS.view);
  if (view === "bars" || view === "heat" || view === "size") s.view = view;
  const mode = params.get(PARAMS.mode);
  if (mode === "count" || mode === "share") s.mode = mode;
  const sort = params.get(PARAMS.sort);
  if (["rateDesc", "rateAsc", "sizeDesc", "gap", "name"].includes(sort ?? ""))
    s.sort = sort as BreakdownSortId;
  const denom = params.get(PARAMS.denom);
  if (denom === "all" || denom === "eligible") s.denom = denom;
  return s;
}

/** Deep-link anchors → dimension (Part B0). */
export function deepLinkDimension(hash: string): BreakdownDimension | null {
  if (hash === "#progress-by-block") return "block";
  if (hash === "#facility-type-summary") return "type";
  return null;
}

export function useBreakdownUrlState(): {
  state: BreakdownUrlState;
  patch: (next: Partial<BreakdownUrlState>) => void;
} {
  const [params, setParams] = useSearchParams();
  const [session] = useState<Partial<BreakdownUrlState>>(() => readSession());

  const state = useMemo(() => resolve(session, params), [session, params]);

  const patch = (next: Partial<BreakdownUrlState>) => {
    const merged = { ...state, ...next };
    writeSession(merged);
    const p = new URLSearchParams(params);
    for (const [k, key] of Object.entries(PARAMS)) p.set(key, merged[k as keyof BreakdownUrlState]);
    setParams(p, { replace: true, preventScrollReset: true });
  };

  // Deep links steer the dimension once, on first mount (PHC never chosen
  // by a deep link — it is an admin opt-in only).
  useEffect(() => {
    const dim = deepLinkDimension(window.location.hash);
    if (dim && dim !== state.dim) patch({ dim });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, patch };
}
