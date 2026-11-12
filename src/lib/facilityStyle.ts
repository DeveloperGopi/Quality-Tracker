/** Facility identity cell style — one preference shared by every list. */

import { useSyncExternalStore } from "react";

export type FacilityStyle = "twoLine" | "oneLine";

export const FACILITY_STYLE_OPTIONS: {
  value: FacilityStyle;
  label: string;
  hint: string;
}[] = [
  {
    value: "twoLine",
    label: "Two-line",
    hint: "Name, then type · PHC · Block",
  },
  {
    value: "oneLine",
    label: "One-line",
    hint: "Name · type · PHC · Block on one line",
  },
];

export function isFacilityStyle(value: unknown): value is FacilityStyle {
  return value === "twoLine" || value === "oneLine";
}

const KEY = "nqas.facilityStyle";
let current: FacilityStyle | null = null;
const listeners = new Set<() => void>();

function stored(): FacilityStyle | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(KEY);
    return isFacilityStyle(value) ? value : null;
  } catch {
    return null;
  }
}

export function getFacilityStyle(): FacilityStyle {
  return current ?? stored() ?? "twoLine";
}

function emit() {
  for (const listener of listeners) listener();
}

export function setFacilityStyle(style: FacilityStyle, persist = true): void {
  if (current === style) return;
  current = style;
  if (persist && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, style);
    } catch {
      /* private mode */
    }
  }
  emit();
}

/** Apply the signed-in user's choice, or the State Admin's default. */
export function hydrateFacilityStyle(
  userValue: unknown,
  adminValue: unknown,
): void {
  const next = isFacilityStyle(userValue)
    ? userValue
    : isFacilityStyle(adminValue)
      ? adminValue
      : stored() ?? "twoLine";
  setFacilityStyle(next, false);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFacilityStyle(): FacilityStyle {
  return useSyncExternalStore(subscribe, getFacilityStyle, () => "twoLine");
}
