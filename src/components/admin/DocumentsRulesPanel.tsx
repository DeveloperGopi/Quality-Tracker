/**
 * ADMIN → DOCUMENTS (Part C ①) — the ONE place a document requirement is set.
 *
 * Each of the six documents gets:
 *   • Mandatory | Optional | Required when… (a rule picker),
 *   • the condition for "Required when…" (certified/conditional, gap closure
 *     amount exists, building is dilapidated, Fire NOC recorded),
 *   • a Blocking / Warning switch,
 *   • the accepted types and the single max size (read-only — they come from
 *     convex/storage/validation, the same rule the server enforces),
 *   • the cycle scope.
 *
 * Saving writes `appSettings.documentRules` through the existing `setSetting`
 * mutation, which audits the old and the new JSON value — and because every
 * screen subscribes to settings, the change applies instantly, with no
 * redeploy. Existing facilities are never blocked retroactively; a facility
 * that now misses a required file is listed under Needs attention instead.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Check, Loader2, Save, ScanText } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DOCUMENT_FIELDS } from "@/lib/documentsConfig";
import { RESULT_READER_SETTING_KEY, isResultReaderEnabled } from "@/lib/readerSettings";
import {
  CONDITION_LABELS,
  defaultDocumentRules,
  normalizeDocumentRules,
  resolveDocRequirement,
  type DocCondition,
  type DocRule,
  type DocRuleMode,
  type DocRuleScope,
  type DocumentRules,
} from "@/lib/documentRules";

const MODE_LABEL: Record<DocRuleMode, string> = {
  mandatory: "Mandatory",
  optional: "Optional",
  conditional: "Required when…",
};

/** Preview the badge for a rule (a certified sample facility). */
function badgePreview(rule: DocRule): string {
  return resolveDocRequirement(rule, {
    certStatus: rule.condition === "certified" ? "Quality Certified" : "Result Awaited",
    gapAmount: rule.condition === "gap_amount" ? 1 : 0,
    dilapidated: rule.condition === "dilapidated",
    fireNocRecorded: rule.condition === "fire_noc",
  }).badge;
}

export function DocumentsRulesPanel() {
  const data = useQuery(api.facilities.getAppSettings, {});
  const setSetting = useMutation(api.facilities.setSetting);

  const saved = useMemo<DocumentRules>(
    () => normalizeDocumentRules(data?.settings?.documentRules),
    [data?.settings?.documentRules],
  );
  const [draft, setDraft] = useState<DocumentRules>(saved);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [readerBusy, setReaderBusy] = useState(false);
  const [readerSavedAt, setReaderSavedAt] = useState<number | null>(null);
  const readerOn = isResultReaderEnabled(data?.settings);

  // A remote change (another admin, or the first load) wins over a clean draft.
  useEffect(() => {
    setDraft((current) => (JSON.stringify(current) === JSON.stringify(saved) ? current : saved));
  }, [saved]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const changedKeys = Object.keys(draft).filter(
    (k) => JSON.stringify(draft[k]) !== JSON.stringify(saved[k]),
  );

  const patch = (key: string, next: Partial<DocRule>) => {
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...next } }));
    setSavedAt(null);
    setError(null);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await setSetting({ key: "documentRules", value: draft });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the document rules");
    } finally {
      setBusy(false);
    }
  };

  const setReader = async (next: boolean) => {
    setReaderBusy(true);
    setReaderSavedAt(null);
    setError(null);
    try {
      await setSetting({ key: RESULT_READER_SETTING_KEY, value: next });
      setReaderSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the reader setting");
    } finally {
      setReaderBusy(false);
    }
  };

  if (data === undefined) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading document rules…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-border/70">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700">
            <ScanText className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Read NQAS result from PDF</p>
            <p className="text-xs text-muted-foreground">
              Shows the result-reader action on an NQAS result document. This switch only controls that action;
              it never changes saved documents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {readerBusy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            {readerSavedAt && !readerBusy && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <Check className="size-3.5" /> Saved
              </span>
            )}
            <Switch
              checked={readerOn}
              disabled={readerBusy}
              onCheckedChange={(value) => void setReader(value)}
              aria-label="Read NQAS result from PDF"
            />
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        One rule per document. The field badge, the save gate, the “n/6 uploaded”
        count, the exports and the Needs-attention list all read this rule — so
        the label can never say “Optional” while saving is blocked.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Document", "Rule", "Condition", "If missing", "Accepts", "Max size", "Scope"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOCUMENT_FIELDS.map((doc) => {
              const rule = draft[doc.docKey] ?? defaultDocumentRules()[doc.docKey];
              return (
                <tr key={doc.docKey} className="border-t border-border/50 align-top">
                  <td className="px-3 py-2">
                    <p className="font-medium">{doc.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      <span
                        className={cn(
                          "rounded border px-1 text-[10px]",
                          rule.mode === "optional"
                            ? "border-border/70 text-muted-foreground"
                            : "border-amber-300/70 bg-amber-50 text-amber-900",
                        )}
                        data-testid={`doc-rule-badge-${doc.docKey}`}
                      >
                        {badgePreview(rule)}
                      </span>
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={rule.mode}
                      onValueChange={(v) => patch(doc.docKey, { mode: v as DocRuleMode })}
                    >
                      <SelectTrigger className="h-8 w-36 text-xs" aria-label={`${doc.label} rule`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(MODE_LABEL) as DocRuleMode[]).map((m) => (
                          <SelectItem key={m} value={m} className="text-xs">
                            {MODE_LABEL[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={rule.condition}
                      onValueChange={(v) => patch(doc.docKey, { condition: v as DocCondition })}
                      disabled={rule.mode !== "conditional"}
                    >
                      <SelectTrigger className="h-8 w-56 text-xs" aria-label={`${doc.label} condition`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(CONDITION_LABELS) as DocCondition[]).map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {CONDITION_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <label className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={rule.blocking}
                        onCheckedChange={(v) => patch(doc.docKey, { blocking: v })}
                        aria-label={`${doc.label} blocks saving when missing`}
                      />
                      {rule.blocking ? "Blocking" : "Warning"}
                    </label>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{doc.typeHint}</td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                    {doc.maxMb} MB
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={rule.scope}
                      onValueChange={(v) => patch(doc.docKey, { scope: v as DocRuleScope })}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs" aria-label={`${doc.label} scope`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cycle" className="text-xs">
                          Per cycle
                        </SelectItem>
                        <SelectItem value="facility" className="text-xs">
                          Per facility
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertTriangle className="size-3.5" /> {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void save()} disabled={!dirty || busy} className="gap-1.5">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save document rules
        </Button>
        <Button
          variant="outline"
          disabled={!dirty || busy}
          onClick={() => {
            setDraft(saved);
            setError(null);
          }}
        >
          Discard
        </Button>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {dirty
            ? `${changedKeys.length} changed — saving applies them instantly`
            : savedAt
              ? "Saved ✓ — applied to every screen"
              : "No changes"}
        </span>
        {savedAt && !dirty && <Check className="size-4 text-emerald-600" />}
      </div>
    </div>
  );
}
