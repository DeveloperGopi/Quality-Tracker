/**
 * DECK SLIDE — one fixed 960 × 540 canvas, the same frame as the PDF page
 * (13.333 × 7.5 in) and the PowerPoint slide. The preview, thumbnails and the
 * report cards all read the same slide model, so nothing reflows between the
 * screen and the downloads.
 *
 * The Theme select picks the SURFACE (light / dark cover / high contrast) in
 * lib/deckDesign; contrast is then resolved from the surface a block sits on.
 * That is what fixes the unreadable dark-on-dark cover and takeaway tiles: a
 * dark slide always selects the dark ink palette (white text on #0B3B3B),
 * while a light slide always selects the light palette. The same surface and
 * density objects drive the PPTX and PDF downloads.
 */
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { ORG_NAME } from "@/lib/org";
import {
  inkOnFill,
  type DeckSlide,
  type SlideBlock,
  type Tone,
  TONE_HEX,
  TONE_INK_DARK,
  TONE_INK_LIGHT,
} from "@/lib/deckModel";
import {
  DECK_SURFACES as SHARED_SURFACES,
  deckDensity,
  resolveDeckSurface,
  scaleDeckFont,
  type DeckDensity,
  type DeckSurface,
  type DeckTheme,
} from "@/lib/deckDesign";

export const DECK_W = 960;
export const DECK_H = 540;

type ThemeName = DeckTheme;
type Surface = DeckSurface;

/** ONE palette source — the exports resolve the same object. */
export const DECK_SURFACES = SHARED_SURFACES;

/** Accessible text versions of the tone palette, shared with the exports. */
export const TONE_TEXT = TONE_INK_LIGHT;
export const TONE_TEXT_DARK = TONE_INK_DARK;

const tone = (t: Tone | undefined, surface: Surface): string =>
  surface.dark ? TONE_TEXT_DARK[t ?? "teal"] : TONE_TEXT[t ?? "teal"];

const fill = (t: Tone | undefined) => TONE_HEX[t ?? "teal"];

const P = 40; // 40 pt safe margin
const HEADER_H = 96;
const FOOTER_H = 34;

function blockWeight(b: SlideBlock): number {
  switch (b.kind) {
    case "kpis":
      return 0.42 * Math.ceil(b.items.length / 3) + 0.1;
    case "bars":
      return 0.34 + 0.15 * Math.max(1, b.items.length);
    case "stacked":
      return 0.95;
    case "table":
      return 0.52 + 0.1 * (b.rows.length + (b.totalRow ? 1 : 0));
    case "heatmap":
      return 0.9 + 0.28 * Math.max(1, b.rows.length);
    case "donut":
      return 1.5;
    case "cards":
      return 0.42 + 0.64 * b.items.length;
    case "facts":
      return 0.38 * Math.max(1, b.items.length) + 0.08;
    case "takeaways":
      return 1;
    case "defs":
      return Math.max(1, Math.ceil(b.items.length / 4)) * 0.7;
    case "text":
      return 0.26 + 0.055 * Math.ceil(b.body.length / 90);
    case "bullets":
      return 0.26 + 0.11 * Math.max(1, b.items.length);
  }
}

/* ------------------------------------------------------------------ */
/* Row primitives                                                      */
/* ------------------------------------------------------------------ */

function BlockTitle({
  children,
  surface,
  density,
  size = 12,
}: {
  children: ReactNode;
  surface: Surface;
  density: DeckDensity;
  size?: number;
}) {
  const d = deckDensity(density);
  return (
    <div
      style={{
        fontSize: scaleDeckFont(size, density, 8),
        fontWeight: 700,
        color: surface.ink,
        lineHeight: 1.2,
        marginBottom: Math.round(6 * d.gapScale),
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function Block({
  block,
  surface,
  density,
  fluid,
}: {
  block: SlideBlock;
  surface: Surface;
  density: DeckDensity;
  fluid?: boolean;
}) {
  const d = deckDensity(density);
  const fs = (n: number) => scaleDeckFont(n, density, 8);
  const gap = (n: number) => Math.max(1, Math.round(n * d.gapScale));
  const pad = (n: number) => Math.max(1, Math.round(n * d.padScale));
  const title =
    "title" in block && block.title ? (
      <BlockTitle surface={surface} density={density}>
        {block.title}
      </BlockTitle>
    ) : null;
  const wrap: CSSProperties = fluid
    ? { width: "100%" }
    : { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" };
  const body: CSSProperties = { flex: 1, minHeight: 0 };

  switch (block.kind) {
    case "kpis": {
      const cols = block.items.length > 4 ? 3 : Math.max(1, Math.min(2, block.items.length));
      return (
        <div style={wrap}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gap: gap(12),
              flex: 1,
              minHeight: 0,
            }}
          >
            {block.items.map((item, i) => (
              <div
                key={i}
                style={{
                  background: surface.panel,
                  border: `1px solid ${surface.line}`,
                  borderRadius: 8,
                  padding: `${pad(10)}px ${pad(12)}px`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    fontSize: fs(34),
                    lineHeight: 1,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: tone(item.tone, surface),
                  }}
                >
                  {item.value}
                </div>
                <div
                  style={{
                    marginTop: gap(5),
                    fontSize: fs(12),
                    lineHeight: 1.25,
                    fontWeight: 700,
                    color: surface.ink,
                  }}
                >
                  {item.label}
                </div>
                {item.note && (
                  <div style={{ fontSize: fs(11), lineHeight: 1.25, color: surface.muted }}>
                    {item.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "bars": {
      const max = Math.max(1, block.max ?? Math.max(...block.items.map((i) => i.value), 1));
      const count = Math.max(1, block.items.length);
      const compact = count > 8;
      return (
        <div style={wrap}>
          {title}
          <div
            style={{
              ...body,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: gap(2),
            }}
          >
            {block.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "38% minmax(0, 1fr) 64px",
                  alignItems: "center",
                  gap: gap(8),
                  flex: 1,
                  minHeight: Math.round((compact ? 16 : 20) * d.rowScale),
                }}
              >
                <span
                  style={{
                    fontSize: fs(compact ? 11 : 12),
                    lineHeight: 1.15,
                    color: surface.ink,
                    overflowWrap: "anywhere",
                  }}
                  data-tip={item.label}
                  data-tip-truncate
                >
                  {item.label}
                </span>
                <span
                  style={{
                    display: "block",
                    height: Math.max(8, Math.round((compact ? 12 : 14) * d.rowScale)),
                    background: surface.panel,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      width: `${Math.max(item.value > 0 ? 1.5 : 0, (item.value / max) * 100)}%`,
                      background: fill(item.tone),
                      borderRadius: 3,
                    }}
                  />
                </span>
                <span
                  style={{
                    textAlign: "right",
                    fontSize: fs(compact ? 11 : 12),
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: surface.ink,
                  }}
                >
                  {item.display ?? item.value}
                </span>
              </div>
            ))}
          </div>
          {block.note && (
            <div
              style={{
                flexShrink: 0,
                marginTop: gap(5),
                fontSize: fs(10),
                lineHeight: 1.3,
                color: surface.muted,
              }}
            >
              {block.note}
            </div>
          )}
        </div>
      );
    }

    case "stacked": {
      const total = Math.max(
        1,
        block.segments.reduce((a, s) => a + s.value, 0),
      );
      const visible = block.segments.filter((s) => s.value > 0);
      return (
        <div style={wrap}>
          {title}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: gap(4),
            }}
          >
            <div
              style={{
                display: "flex",
                height: Math.max(24, Math.round(38 * d.rowScale)),
                borderRadius: 5,
                overflow: "hidden",
                background: surface.panel,
              }}
            >
              {visible.map((s, i) => (
                <div
                  key={i}
                  style={{
                    width: `${(s.value / total) * 100}%`,
                    background: fill(s.tone),
                    color: inkOnFill(fill(s.tone)),
                    fontSize: fs(11),
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: s.value > 0 ? 18 : 0,
                  }}
                >
                  {s.value}
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: gap(7),
                display: "grid",
                gridTemplateColumns: visible.length > 3 ? "1fr 1fr" : "1fr",
                gap: `${gap(3)}px ${gap(14)}px`,
              }}
            >
              {visible.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: gap(6),
                    fontSize: fs(11),
                    lineHeight: 1.25,
                    color: surface.ink,
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      background: fill(s.tone),
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    {s.label}: <b>{s.value}</b> of {total}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {block.note && (
            <div style={{ flexShrink: 0, marginTop: gap(5), fontSize: fs(10), color: surface.muted }}>
              {block.note}
            </div>
          )}
        </div>
      );
    }

    case "table": {
      const rowCount = block.rows.length + (block.totalRow ? 1 : 0);
      const size = fs(rowCount > 10 ? 10.5 : rowCount > 7 ? 11 : 12);
      return (
        <div style={wrap}>
          {title}
          <div style={{ ...body, overflow: "hidden" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
                fontSize: size,
                lineHeight: 1.2,
              }}
            >
              <thead>
                <tr>
                  {block.head.map((h, i) => (
                    <th
                      key={i}
                      style={{
                        background: surface.titleBar,
                        color: surface.titleInk,
                        textAlign:
                          block.align?.[i] === "right" || (i > 0 && block.align?.[i] !== "left")
                            ? "right"
                            : "left",
                        padding: `${pad(5)}px ${pad(6)}px`,
                        fontWeight: 700,
                        fontSize: size,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 ? surface.panel : "transparent" }}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: `${pad(4)}px ${pad(6)}px`,
                          borderBottom: `1px solid ${surface.line}`,
                          textAlign:
                            block.align?.[ci] === "right" || (ci > 0 && block.align?.[ci] !== "left")
                              ? "right"
                              : "left",
                          color: surface.ink,
                          fontVariantNumeric: ci > 0 ? "tabular-nums" : undefined,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {cell === "" ? "-" : cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {block.totalRow && (
                  <tr style={{ background: surface.panel }}>
                    {block.totalRow.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: `${pad(5)}px ${pad(6)}px`,
                          fontWeight: 700,
                          textAlign:
                            block.align?.[ci] === "right" || (ci > 0 && block.align?.[ci] !== "left")
                              ? "right"
                              : "left",
                          color: surface.ink,
                          fontVariantNumeric: ci > 0 ? "tabular-nums" : undefined,
                          borderTop: `2px solid ${surface.line}`,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {block.note && (
            <div style={{ flexShrink: 0, marginTop: gap(4), fontSize: fs(10), color: surface.muted }}>
              {block.note}
            </div>
          )}
        </div>
      );
    }

    case "heatmap": {
      const contrast = surface.key === "contrast" || surface.key === "contrastDark";
      const shade = (n: number) =>
        n <= 0
          ? surface.panel
          : contrast
            ? n < 2
              ? "#E6E6E6"
              : n < 4
                ? "#B3B3B3"
                : n < 7
                  ? "#666666"
                  : surface.key === "contrastDark"
                    ? "#FFFFFF"
                    : "#000000"
            : n < 2
              ? "#DCEEEA"
              : n < 4
                ? "#B3DCD5"
                : n < 7
                  ? "#72B8AE"
                  : "#0F6B63";
      return (
        <div style={wrap}>
          {title}
          <div style={{ ...body, overflow: "hidden" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
                fontSize: fs(11),
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      width: 120,
                      background: surface.titleBar,
                      color: surface.titleInk,
                      textAlign: "left",
                      padding: `${pad(4)}px ${pad(5)}px`,
                      fontSize: fs(11),
                    }}
                  >
                    Year
                  </th>
                  {block.monthLabels.map((m) => (
                    <th
                      key={m}
                      style={{
                        background: surface.titleBar,
                        color: surface.titleInk,
                        padding: `${pad(4)}px ${pad(1)}px`,
                        fontSize: fs(10),
                        fontWeight: 700,
                      }}
                    >
                      {m}
                    </th>
                  ))}
                  <th
                    style={{
                      width: 44,
                      background: surface.titleBar,
                      color: surface.titleInk,
                      fontSize: fs(10),
                      padding: `${pad(4)}px ${pad(2)}px`,
                    }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row) => (
                  <tr key={row.label}>
                    <td
                      style={{
                        padding: `${pad(4)}px ${pad(5)}px`,
                        fontWeight: 700,
                        fontSize: fs(11),
                        color: surface.ink,
                        borderBottom: `1px solid ${surface.line}`,
                      }}
                    >
                      {row.label}
                    </td>
                    {row.cells.map((n, i) => (
                      <td
                        key={i}
                        style={{
                          textAlign: "center",
                          background: shade(n),
                          color: inkOnFill(shade(n)),
                          fontWeight: n > 0 ? 700 : 400,
                          padding: `${pad(4)}px ${pad(1)}px`,
                          border: `1px solid ${surface.bg}`,
                          fontVariantNumeric: "tabular-nums",
                          fontSize: fs(11),
                        }}
                      >
                        {n === 0 ? "-" : n}
                      </td>
                    ))}
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: 700,
                        color: surface.ink,
                        borderBottom: `1px solid ${surface.line}`,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {row.total}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: surface.panel }}>
                  <td style={{ padding: `${pad(4)}px ${pad(5)}px`, fontWeight: 700, color: surface.ink }}>
                    {block.totalLabel}
                  </td>
                  {block.totalCells.map((n, i) => (
                    <td
                      key={i}
                      style={{
                        textAlign: "center",
                        fontWeight: 700,
                        color: surface.ink,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {n}
                    </td>
                  ))}
                  <td
                    style={{
                      textAlign: "center",
                      fontWeight: 700,
                      background: surface.titleBar,
                      color: surface.titleInk,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {block.grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    case "donut": {
      const total = Math.max(
        1,
        block.segments.reduce((a, s) => a + s.value, 0),
      );
      let acc = 0;
      const stops = block.segments
        .map((s) => {
          const from = (acc / total) * 360;
          acc += s.value;
          const to = (acc / total) * 360;
          return `${fill(s.tone)} ${from}deg ${to}deg`;
        })
        .join(", ");
      return (
        <div style={wrap}>
          {title}
          <div
            style={{
              ...body,
              display: "flex",
              alignItems: "center",
              gap: gap(18),
            }}
          >
            <div
              style={{
                position: "relative",
                width: Math.round(164 * d.rowScale),
                height: Math.round(164 * d.rowScale),
                flexShrink: 0,
                borderRadius: "50%",
                background: `conic-gradient(${stops})`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "27%",
                  borderRadius: "50%",
                  background: surface.bg,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: fs(30), fontWeight: 700, lineHeight: 1, color: surface.ink }}>
                  {block.centerValue}
                </span>
                <span
                  style={{
                    fontSize: fs(10),
                    lineHeight: 1.15,
                    color: surface.muted,
                    textAlign: "center",
                    padding: "0 6px",
                  }}
                >
                  {block.centerLabel}
                </span>
              </div>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              {block.segments.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: gap(6),
                    fontSize: fs(11.5),
                    lineHeight: 1.3,
                    color: surface.ink,
                    marginBottom: gap(3),
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      marginTop: 3,
                      flexShrink: 0,
                      background: fill(s.tone),
                    }}
                  />
                  <span>
                    {s.label}: <b>{s.value}</b>
                  </span>
                </div>
              ))}
            </div>
          </div>
          {block.caption && (
            <div style={{ flexShrink: 0, marginTop: gap(4), fontSize: fs(10), color: surface.muted }}>
              {block.caption}
            </div>
          )}
        </div>
      );
    }

    case "cards":
      return (
        <div style={wrap}>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateRows: `repeat(${Math.max(1, block.items.length)}, minmax(0, 1fr))`,
              gap: gap(10),
            }}
          >
            {block.items.map((item, i) => (
              <div
                key={i}
                style={{
                  background: surface.panel,
                  border: `1px solid ${surface.line}`,
                  borderRadius: 8,
                  padding: `${pad(10)}px ${pad(12)}px`,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div style={{ fontSize: fs(11), fontWeight: 700, color: surface.ink }}>
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: fs(30),
                    lineHeight: 1.1,
                    fontWeight: 700,
                    color: tone(item.tone, surface),
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {item.big}
                </div>
                <div style={{ fontSize: fs(12), lineHeight: 1.25, color: surface.ink }}>
                  {item.line}
                </div>
                {item.body && (
                  <div style={{ marginTop: gap(2), fontSize: fs(11), lineHeight: 1.25, color: surface.muted }}>
                    {item.body}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    case "facts":
      return (
        <div style={wrap}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: gap(9) }}>
            {block.items.map((item, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: gap(12),
                  background: surface.panel,
                  border: `1px solid ${surface.line}`,
                  borderRadius: 8,
                  padding: `${pad(8)}px ${pad(12)}px`,
                }}
              >
                <span
                  style={{
                    fontSize: fs(26),
                    fontWeight: 700,
                    lineHeight: 1,
                    minWidth: Math.round(44 * d.rowScale),
                    fontVariantNumeric: "tabular-nums",
                    color: tone(item.tone, surface),
                  }}
                >
                  {item.big}
                </span>
                <span style={{ fontSize: fs(12.5), lineHeight: 1.3, color: surface.ink }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case "takeaways":
      return (
        <div style={wrap}>
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: block.items.length > 3 ? "1fr 1fr" : "1fr",
              gap: gap(10),
              alignContent: "stretch",
            }}
          >
            {block.items.map((item) => (
              <div
                key={item.n}
                style={{
                  background: surface.panel,
                  border: `1px solid ${surface.line}`,
                  borderRadius: 8,
                  padding: `${pad(9)}px ${pad(11)}px`,
                  minHeight: 0,
                }}
              >
                <div style={{ display: "flex", gap: gap(8), alignItems: "baseline" }}>
                  <span style={{ fontSize: fs(18), fontWeight: 700, color: surface.accent }}>
                    {item.n}
                  </span>
                  <span style={{ fontSize: fs(13), fontWeight: 700, lineHeight: 1.2, color: surface.ink }}>
                    {item.title}
                  </span>
                </div>
                <div style={{ marginTop: gap(4), fontSize: fs(11.5), lineHeight: 1.3, color: surface.muted }}>
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "defs":
      return (
        <div style={wrap}>
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: gap(8),
              alignContent: "start",
            }}
          >
            {block.items.map((item) => (
              <div
                key={item.term}
                style={{
                  border: `1px solid ${surface.line}`,
                  borderRadius: 6,
                  padding: `${pad(6)}px ${pad(8)}px`,
                  background: surface.panel,
                }}
              >
                <div style={{ fontSize: fs(11), fontWeight: 700, color: surface.ink }}>{item.term}</div>
                <div style={{ marginTop: gap(2), fontSize: fs(10.5), lineHeight: 1.3, color: surface.muted }}>
                  {item.definition}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "text":
      return (
        <div style={wrap}>
          <p
            style={{
              fontSize: fs(12),
              lineHeight: 1.45,
              color: surface.muted,
              margin: 0,
            }}
          >
            {block.body}
          </p>
        </div>
      );

    case "bullets":
      return (
        <div style={wrap}>
          {title}
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: gap(10),
            }}
          >
            {block.items.map((item, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: gap(8),
                  fontSize: fs(12),
                  lineHeight: 1.35,
                  color: surface.ink,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    marginTop: 5,
                    flexShrink: 0,
                    background:
                      block.tone === "coral"
                        ? TONE_HEX.coral
                        : block.tone === "amber"
                          ? TONE_HEX.amber
                          : surface.accent,
                  }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Fixed canvas                                                        */
/* ------------------------------------------------------------------ */

function Footer({
  surface,
  left,
  page,
  total,
}: {
  surface: Surface;
  left: string;
  page?: number;
  total?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: P,
        right: P,
        bottom: 12,
        height: FOOTER_H - 12,
        borderTop: `1px solid ${surface.line}`,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        fontSize: 10,
        color: surface.muted,
      }}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {left}
      </span>
      {page != null && total != null && (
        <span style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          {page} / {total}
        </span>
      )}
    </div>
  );
}

function CoverSlide({
  slide,
  surface,
  dataAsOf,
  filtersLabel,
  page,
  total,
}: {
  slide: DeckSlide;
  surface: Surface;
  dataAsOf?: string;
  filtersLabel?: string;
  page?: number;
  total?: number;
}) {
  const heroPct = Number(
    String(slide.hero?.label ?? "").match(/(\d+)%/)?.[1] ?? 0,
  );
  return (
    <>
      <div style={{ padding: `${P + 6}px ${P}px 0`, maxWidth: 700 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: surface.accent }}>
          DISTRICT QUALITY ASSURANCE UNIT
        </div>
        <h2
          style={{
            margin: "8px 0 0",
            fontSize: 42,
            lineHeight: 1.05,
            fontWeight: 800,
            color: surface.ink,
            letterSpacing: "-0.01em",
          }}
        >
          {slide.title}
        </h2>
        <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.35, color: surface.muted }}>
          {slide.subtitle}
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          right: P + 8,
          top: 150,
          width: 242,
          height: 242,
          borderRadius: "50%",
          background: `conic-gradient(${surface.heroRing} ${Math.min(100, heroPct)}%, ${surface.heroRingRest} 0)`,
          padding: 12,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background: surface.bg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 16px",
          }}
        >
          <span style={{ fontSize: 62, lineHeight: 1, fontWeight: 800, color: surface.ink }}>
            {slide.hero?.value ?? "-"}
          </span>
          <span style={{ marginTop: 6, fontSize: 12, lineHeight: 1.25, color: surface.muted }}>
            {slide.hero?.label}
          </span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: P,
          right: P,
          top: 340,
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          maxWidth: 640,
        }}
      >
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            color: surface.muted,
            maxWidth: 560,
          }}
        >
          {(slide.columns.flat().find((b) => b.kind === "text") as { body?: string } | undefined)
            ?.body ?? filtersLabel ?? ""}
        </div>
      </div>

      <Footer
        surface={surface}
        left={`${ORG_NAME} · ${filtersLabel ? `${filtersLabel} · ` : ""}${dataAsOf ?? ""}`}
        page={page}
        total={total}
      />
    </>
  );
}

export function DeckSlidePreview({
  slide,
  className,
  page,
  total,
  dataAsOf,
  filtersLabel,
  theme = "light",
  density = "comfortable",
}: {
  slide: DeckSlide;
  className?: string;
  page?: number;
  total?: number;
  dataAsOf?: string;
  filtersLabel?: string;
  theme?: ThemeName;
  density?: DeckDensity;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth || DECK_W;
      setScale(Math.max(0.05, width / DECK_W));
    };
    measure();
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const d = deckDensity(density);
  const surface = resolveDeckSurface(theme, slide.variant);
  const isCover = slide.id === "title";
  const headerH = Math.round(HEADER_H * (density === "compact" ? 0.92 : 1));
  const contentTop = isCover ? 0 : headerH + Math.round(18 * d.gapScale);
  const contentHeight = DECK_H - contentTop - (FOOTER_H + 12);
  const columns = slide.columns.length || 1;
  const colGap = Math.round(20 * d.gapScale);
  const colW = (DECK_W - P * 2 - colGap * (columns - 1)) / columns;

  return (
    <div
      ref={host}
      className={cn("relative w-full overflow-hidden rounded-xl", className)}
      style={{ aspectRatio: "16 / 9", background: surface.bg }}
      data-deck-canvas="960x540"
    >
      <div
        style={{
          width: DECK_W,
          height: DECK_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          background: surface.bg,
          color: surface.ink,
          fontFamily: "Calibri, Carlito, 'Segoe UI', sans-serif",
        }}
        data-deck-slide={slide.id}
      >
        {isCover ? (
          <CoverSlide
            slide={slide}
            surface={surface}
            dataAsOf={dataAsOf}
            filtersLabel={filtersLabel}
            page={page}
            total={total}
          />
        ) : (
          <>
            <div
              style={{
                height: headerH,
                background: surface.titleBar,
                color: surface.titleInk,
                padding: `${Math.round(18 * d.padScale)}px ${P}px 0`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: scaleDeckFont(28, density, 20),
                  lineHeight: 1.12,
                  fontWeight: 700,
                  color: surface.titleInk,
                  maxWidth: 860,
                }}
              >
                {slide.title}
              </h2>
              {slide.subtitle && (
                <p
                  style={{
                    margin: `${Math.round(5 * d.gapScale)}px 0 0`,
                    fontSize: scaleDeckFont(14, density, 11),
                    lineHeight: 1.25,
                    color: surface.titleInk,
                    maxWidth: 860,
                  }}
                >
                  {slide.subtitle}
                </p>
              )}
            </div>

            <div
              style={{
                position: "absolute",
                top: contentTop,
                left: P,
                right: P,
                height: contentHeight,
                display: "flex",
                gap: colGap,
              }}
            >
              {slide.columns.map((blocks, ci) => {
                const weights = blocks.map(blockWeight);
                const sum = weights.reduce((a, b) => a + b, 0) || 1;
                return (
                  <div
                    key={ci}
                    style={{
                      width: colW,
                      display: "flex",
                      flexDirection: "column",
                      gap: Math.round(12 * d.gapScale),
                      minWidth: 0,
                    }}
                  >
                    {blocks.map((block, bi) => (
                      <div
                        key={bi}
                        style={{
                          flex: weights[bi] / sum,
                          minHeight: 0,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <Block block={block} surface={surface} density={density} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <Footer
              surface={surface}
              left={`${ORG_NAME} · NQAS Summary Report · Data as of ${dataAsOf ?? ""}`}
              page={page}
              total={total}
            />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Responsive block view for the scrolling report page. It uses the SAME block
 * components as the slide canvas but lets cards grow with their content — the
 * report page is a report, not a wall of 16:9 slides.
 */
export function DeckBlocksView({
  slide,
  className,
}: {
  slide: DeckSlide;
  className?: string;
}) {
  const columns = useMemo(() => slide.columns, [slide.columns]);
  return (
    <div
      className={cn("grid gap-4 @container", className)}
      data-deck-blocks
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        alignItems: "start",
      }}
    >
      {columns.map((blocks, ci) => (
        <div key={ci} style={{ display: "grid", gap: 18, minWidth: 0 }}>
          {blocks.map((block, bi) => (
            <div key={bi} style={{ minWidth: 0 }}>
              <Block block={block} surface={SHARED_SURFACES.light} density="comfortable" fluid />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
