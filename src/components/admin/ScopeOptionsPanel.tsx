/**
 * Admin → General → Scope options.
 *
 * The one editable list behind the State and NQAS Assessment → Scope
 * sections. Add, rename and reorder; every action writes
 * appSettings.scopeOptions through the existing audited setSetting mutation,
 * so there is no second storage model.
 */

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, ListPlus, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountBadge, SectionHeader } from "@/components/admin/AdminUi";
import { DEFAULT_SETTINGS } from "@/convex/lifecycle";

export function ScopeOptionsPanel({
  value,
  onSave,
}: {
  value: string[];
  onSave: (next: string[]) => Promise<boolean>;
}) {
  const resolved = value.length ? value : DEFAULT_SETTINGS.scopeOptions;
  const [items, setItems] = useState<string[]>(resolved);
  const [newOption, setNewOption] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    setItems(resolved);
  }, [resolved]);

  const save = async (next: string[]) => {
    if (JSON.stringify(next) === JSON.stringify(items)) return;
    setBusy(true);
    setStatus("idle");
    setItems(next);
    const ok = await onSave(next);
    if (!ok) setItems(resolved);
    setStatus(ok ? "saved" : "error");
    setBusy(false);
  };

  const commitRename = (index: number, raw: string) => {
    const nextName = raw.trim();
    const current = items[index] ?? "";
    if (!nextName || nextName === current) {
      setItems((list) => list.map((v, i) => (i === index ? current : v)));
      return;
    }
    if (items.some((v, i) => i !== index && v.toLowerCase() === nextName.toLowerCase())) {
      toast.error(`“${nextName}” is already in this list`);
      setItems((list) => list.map((v, i) => (i === index ? current : v)));
      return;
    }
    setItems((list) => list.map((v, i) => (i === index ? nextName : v)));
    void save(items.map((v, i) => (i === index ? nextName : v)));
  };

  const addOption = () => {
    const nextName = newOption.trim();
    if (!nextName) return;
    if (items.some((v) => v.toLowerCase() === nextName.toLowerCase())) {
      toast.error(`“${nextName}” is already in this list`);
      return;
    }
    setNewOption("");
    void save([...items, nextName]);
  };

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    void save(next);
  };

  return (
    <section
      data-admin-anchor="scope-options"
      className="scroll-mt-40 rounded-xl border border-border/60 bg-background/60"
    >
      <div className="border-b border-border/60 p-4">
        <SectionHeader
          icon={ListPlus}
          title="Scope options"
          description="The cards offered in State and NQAS Assessment → Scope. Add, rename or reorder; changes save immediately and are audit-logged."
          right={
            <>
              <CountBadge value={`${items.length} options`} />
              {busy && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> Saving
                </span>
              )}
              {!busy && status === "saved" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Check className="size-3.5" /> Saved
                </span>
              )}
              {!busy && status === "error" && (
                <span className="text-xs font-medium text-destructive">Could not save</span>
              )}
            </>
          }
        />
      </div>

      <ul className="divide-y divide-border/50">
        {items.map((option, index) => (
          <li key={`${index}-${option}`} className="flex items-center gap-2 px-3 py-2">
            <GripVertical className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              defaultValue={option}
              key={`${index}-${option}-name`}
              aria-label={`Rename scope option ${index + 1}`}
              className="h-9 min-w-0 flex-1"
              onBlur={(event) => commitRename(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  event.currentTarget.value = option;
                  event.currentTarget.blur();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-9 shrink-0"
              disabled={busy || index === 0}
              aria-label={`Move ${option} up`}
              onClick={() => move(index, -1)}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-9 shrink-0"
              disabled={busy || index === items.length - 1}
              aria-label={`Move ${option} down`}
              onClick={() => move(index, 1)}
            >
              <ArrowDown className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 p-3">
        <Input
          value={newOption}
          onChange={(event) => setNewOption(event.target.value)}
          placeholder="New scope option"
          aria-label="New scope option"
          className="h-10 min-w-52 flex-1"
          onKeyDown={(event) => {
            if (event.key === "Enter") addOption();
          }}
        />
        <Button
          type="button"
          className="h-10"
          disabled={busy || !newOption.trim()}
          onClick={addOption}
        >
          <Plus className="mr-1.5 size-4" /> Add option
        </Button>
      </div>
    </section>
  );
}
