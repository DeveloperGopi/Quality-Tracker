/**
 * Admin → General → Department names.
 *
 * The PDF name stays exactly as printed; the canonical name is what Block
 * Compare groups by. An unmatched PDF name is still saved as written and is
 * marked "New" in the preview.
 */

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Tags, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_SETTINGS } from "@/convex/lifecycle";

export type DepartmentName = { pdfName: string; canonicalName: string };

function cleanRows(raw: unknown): DepartmentName[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) =>
      row && typeof row === "object"
        ? {
            pdfName: String((row as Record<string, unknown>).pdfName ?? "").trim(),
            canonicalName: String(
              (row as Record<string, unknown>).canonicalName ?? "",
            ).trim(),
          }
        : null,
    )
    .filter((row): row is DepartmentName => !!row && !!row.pdfName);
}

export function DepartmentNamesPanel({
  value,
  onSave,
}: {
  value: unknown;
  onSave: (rows: DepartmentName[]) => Promise<void>;
}) {
  const initial = cleanRows(value);
  const [rows, setRows] = useState<DepartmentName[]>(
    initial.length > 0
      ? initial
      : cleanRows(DEFAULT_SETTINGS.departmentNames),
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (dirty) return;
    const next = cleanRows(value);
    if (next.length > 0) setRows(next);
  }, [value, dirty]);

  const update = (index: number, patch: Partial<DepartmentName>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setDirty(true);
    setSaved(false);
    setError(null);
  };

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    setRows((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setDirty(true);
    setSaved(false);
  };

  const save = async () => {
    const cleaned = rows
      .map((row) => ({
        pdfName: row.pdfName.trim(),
        canonicalName: (row.canonicalName || row.pdfName).trim(),
      }))
      .filter((row) => row.pdfName);
    const seen = new Set<string>();
    for (const row of cleaned) {
      const key = row.pdfName.toLowerCase();
      if (seen.has(key)) {
        setError(`“${row.pdfName}” appears more than once.`);
        return;
      }
      seen.add(key);
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(cleaned);
      setRows(cleaned);
      setDirty(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save department names");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="general-department-names"
      data-admin-anchor="general-department-names"
      className="rounded-xl border border-border/60 bg-background/60 p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Tags className="size-4" /> Department names
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Match the department name printed in the Annexure I PDF to one
            canonical name. Block Compare groups by the canonical name. A name
            that is not listed is kept as written and marked “New” in the
            preview.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => void save()}
          disabled={!dirty || saving}
        >
          <Save className="mr-1.5 size-3.5" />
          {saving ? "Saving…" : "Save names"}
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5.5rem] gap-2 px-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          <span>PDF name</span>
          <span>Canonical name</span>
          <span />
        </div>
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5.5rem] items-center gap-2"
          >
            <Input
              value={row.pdfName}
              onChange={(event) => update(index, { pdfName: event.target.value })}
              aria-label={`PDF department name ${index + 1}`}
              className="h-8 text-xs"
            />
            <Input
              value={row.canonicalName}
              onChange={(event) =>
                update(index, { canonicalName: event.target.value })
              }
              aria-label={`Canonical department name ${index + 1}`}
              className="h-8 text-xs"
            />
            <div className="flex items-center justify-end gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Move ${row.pdfName || "department"} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Move ${row.pdfName || "department"} down`}
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Remove ${row.pdfName || "department"}`}
                onClick={() => {
                  setRows((current) => current.filter((_, i) => i !== index));
                  setDirty(true);
                  setSaved(false);
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            setRows((current) => [...current, { pdfName: "", canonicalName: "" }]);
            setDirty(true);
            setSaved(false);
          }}
        >
          <Plus className="mr-1 size-3.5" /> Add department
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            setRows(cleanRows(DEFAULT_SETTINGS.departmentNames));
            setDirty(true);
            setSaved(false);
          }}
        >
          Reset to seed names
        </Button>
        {saved && !dirty && (
          <span className="text-[11px] font-medium text-emerald-800">
            Saved. Every save is in Audit and logs.
          </span>
        )}
        {error && (
          <span className="text-[11px] font-medium text-rose-800">{error}</span>
        )}
      </div>
    </div>
  );
}
