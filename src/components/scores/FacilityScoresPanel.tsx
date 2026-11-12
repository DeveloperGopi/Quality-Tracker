/**
 * Quick View → Scores. One query returns every saved cycle for the facility;
 * the selector and the “change vs previous cycle” are derived here.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScoreBar, ScoreLegend } from "@/components/scores/ScoreBars";
import { DEFAULT_SCORE_BANDS } from "@/lib/scoreBands";
import { scoreChangeText } from "@/lib/scoreBands";
import { cn } from "@/lib/utils";

type ScoreRow = {
  cycleId: string;
  cycleNumber: number;
  cycleType: string | null;
  overall: number | null;
  pss: number | null;
  areas: { key: string; name: string; score: number | null }[];
  departments: {
    name: string;
    canonicalName: string;
    score: number | null;
    isNew: boolean;
  }[];
};

function changeBetween(
  value: number | null,
  previous: number | null | undefined,
): number | null {
  if (value == null || previous == null) return null;
  return value - previous;
}

export function FacilityScoresPanel({ facilityId }: { facilityId: string }) {
  const data = useQuery(api.annexure.forFacility, {
    facilityId: facilityId as never,
  });
  const rows = (data?.rows ?? []) as ScoreRow[];
  const bands = data?.scoreBands ?? DEFAULT_SCORE_BANDS;
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (rows.length === 0) {
      setSelected("");
      return;
    }
    setSelected((current) =>
      rows.some((row) => row.cycleId === current)
        ? current
        : rows[rows.length - 1].cycleId,
    );
  }, [rows]);

  const index = rows.findIndex((row) => row.cycleId === selected);
  const row = index >= 0 ? rows[index] : rows[rows.length - 1] ?? null;
  const previous = index > 0 ? rows[index - 1] : index < 0 ? rows[rows.length - 2] : null;
  const previousAreas = useMemo(
    () => new Map((previous?.areas ?? []).map((a) => [a.key, a.score])),
    [previous],
  );
  const previousDepartments = useMemo(
    () =>
      new Map(
        (previous?.departments ?? []).map((d) => [
          (d.canonicalName || d.name).toLowerCase(),
          d.score,
        ]),
      ),
    [previous],
  );

  if (!data) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Loading scores…
      </div>
    );
  }

  if (!row) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">No scores yet</p>
        <p className="mt-1 text-xs">
          Read the Annexure I section from this facility’s NQAS Result PDF to
          save its area, department and PSS scores.
        </p>
      </div>
    );
  }

  const overallChange = changeBetween(row.overall, previous?.overall);
  const pssChange = changeBetween(row.pss, previous?.pss);

  return (
    <div className="space-y-4 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">Annexure I scores</p>
          <p className="text-[11px] text-muted-foreground">
            {row.areas.length ? "Area of Concern wise score" : "Area scores were not read"}
            {previous ? ` · change vs Cycle #${previous.cycleNumber}` : " · no previous cycle"}
          </p>
        </div>
        <Select value={selected || row.cycleId} onValueChange={setSelected}>
          <SelectTrigger className="h-8 w-44 text-xs" aria-label="Scores cycle">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {rows.map((item) => (
              <SelectItem key={item.cycleId} value={item.cycleId}>
                Cycle #{item.cycleNumber}{item.cycleType ? ` · ${item.cycleType}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">Overall score</span>
            <span className="text-lg font-bold tabular-nums text-foreground">
              {row.overall == null ? "-" : row.overall.toFixed(2)}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            vs previous: {scoreChangeText(overallChange)}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">PSS</span>
            <span className="text-lg font-bold tabular-nums text-foreground">
              {row.pss == null ? "-" : row.pss.toFixed(2)}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            vs previous: {scoreChangeText(pssChange)}
          </p>
        </div>
      </div>

      <section aria-label="Area scores">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold">Areas A–H</h4>
          <span className="text-[10px] text-muted-foreground">
            {row.areas.filter((a) => a.score != null).length} of 8 scored
          </span>
        </div>
        <div className="space-y-2.5">
          {row.areas.map((area) => (
            <ScoreBar
              key={area.key}
              label={`${area.key} · ${area.name}`}
              value={area.score}
              bands={bands}
              hint={
                previous
                  ? `Δ ${scoreChangeText(changeBetween(area.score, previousAreas.get(area.key)))}`
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      {row.departments.length > 0 && (
        <section aria-label="Department scores">
          <h4 className="mb-2 text-xs font-semibold">Departments</h4>
          <div className="space-y-2.5">
            {row.departments.map((department) => {
              const canonical = department.canonicalName || department.name;
              return (
                <ScoreBar
                  key={`${department.name}-${canonical}`}
                  label={
                    canonical === department.name
                      ? department.name
                      : `${department.name} · ${canonical}`
                  }
                  value={department.score}
                  bands={bands}
                  hint={
                    previous
                      ? `Δ ${scoreChangeText(
                          changeBetween(
                            department.score,
                            previousDepartments.get(canonical.toLowerCase()),
                          ),
                        )}`
                      : undefined
                  }
                />
              );
            })}
          </div>
        </section>
      )}

      <ScoreLegend bands={bands} />
      <p className={cn("text-[10px] text-muted-foreground")}>
        The change is this cycle minus the previous saved cycle. A difference
        below 0.05 reads “No change”.
      </p>
    </div>
  );
}
