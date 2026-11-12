/**
 * DECK DESIGN TOKENS — the ONE theme and density definition shared by the
 * on-screen preview (components/deck/DeckSlidePreview), the PPTX renderer
 * (lib/deckRender) and the PDF renderer (lib/deckPdf).
 *
 * Before this module the Theme and Density selects only changed the preview:
 * `buildDeckPptxFromModel` and `buildDeckPdf` painted the default teal/white
 * palette at comfortable spacing, so the downloaded deck silently ignored
 * both settings. Every renderer now resolves its surface and spacing here, so
 * a high-contrast deck or a compact deck looks the same in all three places.
 */

export type DeckTheme = "light" | "dark-cover" | "high-contrast";
export type DeckDensity = "comfortable" | "compact";
export type DeckVariant = "light" | "cover" | "dark";

export type DeckSurface = {
  key: "light" | "dark" | "contrast" | "contrastDark";
  dark: boolean;
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  titleBar: string;
  titleInk: string;
  /** Zebra row and total-row fills for tables on this surface. */
  rowAlt: string;
  totalRow: string;
  /** Cover hero ring (outer circle, inner circle, ring progress, remainder). */
  heroOuter: string;
  heroInner: string;
  heroInk: string;
  heroRing: string;
  heroRingRest: string;
};

export const DECK_SURFACES: Record<DeckSurface["key"], DeckSurface> = {
  light: {
    key: "light",
    dark: false,
    bg: "#FFFFFF",
    panel: "#F2F7F6",
    ink: "#12302E",
    muted: "#4E6663",
    line: "#D6E2E0",
    accent: "#0F6B63",
    titleBar: "#0F6B63",
    titleInk: "#FFFFFF",
    rowAlt: "#F7FAF9",
    totalRow: "#E3EEEC",
    heroOuter: "#0E4C4C",
    heroInner: "#12777A",
    heroInk: "#FFFFFF",
    heroRing: "#9BD8D0",
    heroRingRest: "#1C5A57",
  },
  dark: {
    key: "dark",
    dark: true,
    bg: "#0B3B3B",
    panel: "#124A48",
    ink: "#F5FBFA",
    muted: "#BFDCD8",
    line: "#2C6360",
    accent: "#9BD8D0",
    titleBar: "#0B3B3B",
    titleInk: "#FFFFFF",
    rowAlt: "#0F4444",
    totalRow: "#164F4C",
    heroOuter: "#0E4C4C",
    heroInner: "#12777A",
    heroInk: "#FFFFFF",
    heroRing: "#9BD8D0",
    heroRingRest: "#1C5A57",
  },
  contrast: {
    key: "contrast",
    dark: false,
    bg: "#FFFFFF",
    panel: "#FFFFFF",
    ink: "#000000",
    muted: "#1A1A1A",
    line: "#000000",
    accent: "#000000",
    titleBar: "#000000",
    titleInk: "#FFFFFF",
    rowAlt: "#FFFFFF",
    totalRow: "#FFFFFF",
    heroOuter: "#000000",
    heroInner: "#000000",
    heroInk: "#FFFFFF",
    heroRing: "#000000",
    heroRingRest: "#B3B3B3",
  },
  contrastDark: {
    key: "contrastDark",
    dark: true,
    bg: "#000000",
    panel: "#000000",
    ink: "#FFFFFF",
    muted: "#FFFFFF",
    line: "#FFFFFF",
    accent: "#FFFFFF",
    titleBar: "#000000",
    titleInk: "#FFFFFF",
    rowAlt: "#000000",
    totalRow: "#000000",
    heroOuter: "#FFFFFF",
    heroInner: "#000000",
    heroInk: "#FFFFFF",
    heroRing: "#FFFFFF",
    heroRingRest: "#4D4D4D",
  },
};

export function isDarkSlide(variant: DeckVariant | undefined): boolean {
  return variant === "cover" || variant === "dark";
}

/**
 * Resolve the palette for one slide:
 *  • light        — every slide is white with the teal title bar,
 *  • dark-cover   — cover and closing slides are dark; content stays white,
 *  • high-contrast— black/white AA surfaces (dark slides invert).
 */
export function resolveDeckSurface(
  theme: DeckTheme | undefined,
  variant: DeckVariant | undefined,
): DeckSurface {
  const t: DeckTheme = theme ?? "light";
  if (t === "high-contrast") {
    return isDarkSlide(variant) ? DECK_SURFACES.contrastDark : DECK_SURFACES.contrast;
  }
  if (t === "dark-cover") {
    return isDarkSlide(variant) ? DECK_SURFACES.dark : DECK_SURFACES.light;
  }
  return DECK_SURFACES.light;
}

export type DeckDensitySpec = {
  key: DeckDensity;
  /** Type scale for every deck body label (headings keep their own size). */
  fontScale: number;
  /** Vertical gaps between blocks and inside grids. */
  gapScale: number;
  /** Padding inside tiles, cells and panels. */
  padScale: number;
  /** Table / heatmap row heights. */
  rowScale: number;
};

export const DECK_DENSITY: Record<DeckDensity, DeckDensitySpec> = {
  comfortable: { key: "comfortable", fontScale: 1, gapScale: 1, padScale: 1, rowScale: 1 },
  compact: { key: "compact", fontScale: 0.9, gapScale: 0.72, padScale: 0.78, rowScale: 0.82 },
};

export function deckDensity(density: DeckDensity | undefined): DeckDensitySpec {
  return density === "compact" ? DECK_DENSITY.compact : DECK_DENSITY.comfortable;
}

/** Round a font size after the density scale, never below `min` points. */
export function scaleDeckFont(
  size: number,
  density: DeckDensity | undefined,
  min = 7,
): number {
  const scaled = size * deckDensity(density).fontScale;
  return Math.max(min, Math.round(scaled * 10) / 10);
}

/** Scale a gap/padding/row-height value by the density. */
export function scaleDeckSpace(
  size: number,
  density: DeckDensity | undefined,
  min = 0,
): number {
  return Math.max(min, Math.round(size * deckDensity(density).gapScale * 100) / 100);
}
