/**
 * ONE facility identity cell for every list (Master List, Document Library,
 * Report line lists, Pending & Follow-up, Quick View).
 *
 * Line 1: the facility name in bold.
 * Line 2: the type as a small pill, then PHC and Block.
 * The PHC is hidden when it simply repeats the facility name (CHC/PHC rows).
 * NIN lives in its own column and in the tooltip — never in this cell.
 *
 * Long values are clamped to one line with an ellipsis; the complete value is
 * always in the tooltip. No per-row queries: the style comes from the shared
 * store and every field arrives with the row.
 */

import { memo } from "react";
import { Link, useNavigate } from "react-router";
import { FacilityTypeBadge } from "@/components/FacilityTypeBadge";
import { cn } from "@/lib/utils";
import { useFacilityStyle, type FacilityStyle } from "@/lib/facilityStyle";

export type FacilityLike = {
  _id?: string;
  id?: string;
  name?: string | null;
  facilityType?: string | null;
  block?: string | null;
  phc?: string | null;
  ninNumber?: string | null;
};

export function facilityTypeLabel(value: string | null | undefined): string {
  // The stored facility type exactly as entered (PHC, HWC HSC, …).
  return String(value ?? "").trim() || "-";
}

/** Compare a PHC and facility name without case, spacing or punctuation. */
function samePlace(a: string, b: string): boolean {
  const clean = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return clean(a) !== "" && clean(a) === clean(b);
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: { hit: boolean; text: string }[] = [];
  let at = 0;
  while (at < text.length) {
    const found = lower.indexOf(q, at);
    if (found < 0) {
      parts.push({ hit: false, text: text.slice(at) });
      break;
    }
    if (found > at) parts.push({ hit: false, text: text.slice(at, found) });
    parts.push({ hit: true, text: text.slice(found, found + q.length) });
    at = found + q.length;
  }
  return (
    <>
      {parts.map((part, index) =>
        part.hit ? (
          <mark
            key={index}
            className="rounded-sm bg-amber-200/80 font-semibold text-inherit"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

function FacilityCellView({
  facility,
  query = "",
  onOpen,
  compact = false,
  style: styleProp,
  className,
  nameAs = "span",
  nameId,
}: {
  facility: FacilityLike;
  /** Search text; matches are highlighted on the visible lines. */
  query?: string;
  /** Inline Quick View opener. Omitted → the master-list quick view URL. */
  onOpen?: () => void;
  /** Compact rows use the one-line layout. */
  compact?: boolean;
  /** Optional override (previews, tests). */
  style?: FacilityStyle;
  /** Kept for callers: NIN is never printed in this cell any more. */
  showNin?: boolean;
  className?: string;
  /** Quick View uses an h2 so its dialog label still points at the name. */
  nameAs?: "span" | "h2";
  nameId?: string;
}) {
  const navigate = useNavigate();
  const preferred = useFacilityStyle();
  const style: FacilityStyle =
    styleProp ?? (compact && preferred === "twoLine" ? "oneLine" : preferred);

  const name = facility.name?.trim() || "-";
  const type = facilityTypeLabel(facility.facilityType);
  const block = (facility.block ?? "").trim() || "-";
  const phc = (facility.phc ?? "").trim() || "-";
  const nin = (facility.ninNumber ?? "").trim() || "-";
  const isPhcItself = ["PHC", "CHC", "UPHC", "UGPHC"].includes(type.toUpperCase());
  // A CHC/PHC is not "under" its own PHC field; showing it would repeat the name.
  const hidePhc = phc !== "-" && (isPhcItself || samePlace(phc, name));

  const tip = [
    `Name: ${name}`,
    `Type: ${type}`,
    `PHC: ${phc}`,
    `Block: ${block}`,
    `NIN: ${nin}`,
  ].join(" · ");
  const id = String(facility._id ?? facility.id ?? "");
  const NameTag = nameAs === "h2" ? "h2" : "span";

  const secondary = (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1 whitespace-nowrap text-muted-foreground",
        style === "oneLine" ? "flex-1" : "w-full",
      )}
      style={{ fontSize: 12.5, lineHeight: 1.3 }}
    >
      {type === "-" ? (
        <span className="shrink-0">-</span>
      ) : (
        <FacilityTypeBadge type={type} showTip={false} className="shrink-0" />
      )}
      {!hidePhc && (
        <>
          <span className="shrink-0 text-muted-foreground/60" aria-hidden>
            ·
          </span>
          <span className="min-w-0 truncate">
            <Highlight text={`PHC ${phc}`} query={query} />
          </span>
        </>
      )}
      <span className="shrink-0 text-muted-foreground/60" aria-hidden>
        ·
      </span>
      <span className="min-w-0 truncate">
        <Highlight text={`Block ${block}`} query={query} />
      </span>
    </span>
  );

  return (
    <Link
      to={id ? `/facilities/${id}` : "/facilities"}
      data-tip={tip}
      data-facility-style={style}
      style={{ backgroundColor: "var(--row-bg, transparent)" }}
      aria-label={tip}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return; // new tab → profile
        e.preventDefault();
        e.stopPropagation();
        if (onOpen) onOpen();
        else if (id) navigate(`/facilities?facility=${encodeURIComponent(id)}&section=overview`);
      }}
      className={cn(
        "flex min-h-9 min-w-0 items-center overflow-hidden text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        style === "oneLine"
          ? "flex-row gap-1.5"
          : "flex-col items-start justify-center gap-0",
        className,
      )}
    >
      <NameTag
        id={nameId}
        className={cn(
          "block max-w-full truncate font-semibold",
          style === "oneLine" && "min-w-0 shrink",
        )}
        style={{ fontSize: nameAs === "h2" ? 18 : 14, lineHeight: 1.25 }}
      >
        <Highlight text={name} query={query} />
      </NameTag>
      {style === "oneLine" && (
        <span className="shrink-0 text-muted-foreground" aria-hidden>
          ·
        </span>
      )}
      {secondary}
    </Link>
  );
}

/**
 * Memoized so a row-level state change (sort chip, resize, hover) does not
 * rebuild every identity cell.
 */
export const FacilityCell = memo(FacilityCellView);
