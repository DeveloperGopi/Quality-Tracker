/**
 * PREFERENCES TAB — every row saves INSTANTLY (no Save bar): the mutation
 * writes one preference, the row shows "Saved ✓" with an Undo for 5 seconds,
 * and the change applies to the current screen immediately (the sidebar one
 * applies locally first, so the rail/expanded switch never waits for a round
 * trip).
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/FieldEditor";
import {
  DENSITY_OPTIONS,
  FORMAT_NOTE,
  LANDING_PAGES,
  ROWS_PER_PAGE_OPTIONS,
  SIDEBAR_OPTIONS,
} from "@/lib/profileConfig";

export type PreferenceKey =
  | "language"
  | "landingPage"
  | "density"
  | "sidebar"
  | "rowsPerPage"
  | "highlightUpdates"
  | "firstVisitTips";

export default function PreferencesTab({
  preferences,
  savedKey,
  onUndo,
  onChange,
}: {
  preferences: Record<string, unknown>;
  savedKey: string | null;
  onUndo: () => void;
  onChange: (key: PreferenceKey, value: unknown) => void;
}) {
  return (
    <section
      data-testid="preferences-tab"
      className="rounded-xl border border-border/60 bg-card p-4"
      aria-label="Preferences"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Preferences</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Applied on every device, as soon as you change them.
          </p>
        </div>
        <SavedMarker show={savedKey?.startsWith("preferences.")} onUndo={onUndo} />
      </div>

      <div className="mt-3 -mx-3 border-t border-border/40">
        <PrefRow label="Table density">
          <Segmented
            testId="pref-density"
            label="Table density"
            value={String(preferences.density ?? "comfortable")}
            options={DENSITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => onChange("density", v)}
          />
        </PrefRow>

        <PrefRow label="Sidebar default">
          <Segmented
            testId="pref-sidebar"
            label="Sidebar default"
            value={String(preferences.sidebar ?? "expanded")}
            options={SIDEBAR_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(v) => onChange("sidebar", v)}
          />
        </PrefRow>

        <PrefRow label="Default landing page">
          <Select
            value={String(preferences.landingPage ?? "/dashboard")}
            onValueChange={(v) => onChange("landingPage", v)}
          >
            <SelectTrigger className="h-9 w-56 text-sm" aria-label="Default landing page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANDING_PAGES.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PrefRow>

        <PrefRow label="Rows per page">
          <Segmented
            testId="pref-rows"
            label="Rows per page"
            value={String(preferences.rowsPerPage ?? 50)}
            options={ROWS_PER_PAGE_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(v) => onChange("rowsPerPage", Number(v))}
          />
        </PrefRow>

        <PrefRow label="Highlight recently updated cells">
          <Switch
            checked={preferences.highlightUpdates !== false}
            onCheckedChange={(v) => onChange("highlightUpdates", v)}
            aria-label="Highlight recently updated cells"
            data-testid="pref-highlight"
          />
        </PrefRow>

        <PrefRow label="First-visit tips">
          <Switch
            checked={preferences.firstVisitTips !== false}
            onCheckedChange={(v) => onChange("firstVisitTips", v)}
            aria-label="First-visit tips"
            data-testid="pref-tips"
          />
        </PrefRow>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">{FORMAT_NOTE}</p>
    </section>
  );
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-border/40 px-3 py-1.5 last:border-b-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** The small "Saved ✓ · Undo" confirmation (5 seconds). */
export function SavedMarker({ show, onUndo }: { show: boolean | undefined; onUndo: () => void }) {
  if (!show) return null;
  return (
    <span
      data-testid="pref-saved"
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700"
      role="status"
    >
      Saved ✓
      <button
        type="button"
        onClick={onUndo}
        className="rounded px-1 font-semibold text-primary underline-offset-2 hover:underline"
      >
        Undo
      </button>
    </span>
  );
}
