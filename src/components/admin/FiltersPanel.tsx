/** Admin → Filters — the default filter values for data pages. */

import { Filter, RotateCcw } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DEFAULT_SETTINGS } from "@/convex/lifecycle";
import { SectionHeader, UnsavedDot } from "@/components/admin/AdminUi";

const DEFAULTS = DEFAULT_SETTINGS as unknown as Record<string, unknown>;

export function FiltersPanel({
  settings,
  draft,
  setPending,
}: {
  settings: Record<string, unknown>;
  draft: Record<string, unknown>;
  /** Draft setter: pass `undefined` as the value to revert a key. */
  setPending: (key: string, value: unknown) => void;
}) {
  const valueOf = (key: string): unknown =>
    draft[key] !== undefined
      ? draft[key]
      : settings[key] !== undefined
        ? settings[key]
        : DEFAULTS[key];

  const facilityTypes =
    (settings.facilityTypes as string[] | undefined) ??
    (DEFAULT_SETTINGS.facilityTypes as string[]);
  const facilityType =
    typeof valueOf("blockCompareFacilityType") === "string"
      ? (valueOf("blockCompareFacilityType") as string)
      : "";
  const cycle =
    typeof valueOf("blockCompareCycle") === "string"
      ? (valueOf("blockCompareCycle") as string)
      : "current";
  const cycleOptions = [
    { value: "current", label: "Current cycle" },
    ...Array.from({ length: 10 }, (_, i) => ({
      value: String(i + 1),
      label: `Cycle #${i + 1}`,
    })),
  ];
  const hasUnsaved =
    draft.blockCompareFacilityType !== undefined ||
    draft.blockCompareCycle !== undefined;

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Filter}
        title="Filters"
        description="Default filter values for data pages. Users can still change them in the page’s FilterBar."
        right={hasUnsaved ? <UnsavedDot /> : null}
      />

      <div
        id="filters-block-compare"
        data-admin-anchor="filters-block-compare"
        className="rounded-xl border border-border/60 bg-background/60 p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Block Compare</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              The filters a first-time visitor sees on Block Compare. A user
              who already chose their own filters keeps their choice.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setPending("blockCompareFacilityType", "");
              setPending("blockCompareCycle", "current");
            }}
          >
            <RotateCcw className="size-3.5" /> Reset
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium">
            <span>Facility type</span>
            <Select
              value={facilityType || "all"}
              onValueChange={(value) =>
                setPending(
                  "blockCompareFacilityType",
                  value === "all" ? "" : value,
                )
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facility types</SelectItem>
                {facilityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1.5 text-xs font-medium">
            <span>Cycle</span>
            <Select
              value={cycle}
              onValueChange={(value) =>
                setPending("blockCompareCycle", value)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cycleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </div>
    </div>
  );
}
