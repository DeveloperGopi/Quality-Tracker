/**
 * FIELDEDITOR — the ONE inline editor for a single value.
 *
 * Contract (identical on every screen that uses it):
 *   • click or Enter opens the editor on a text row,
 *   • Enter or blur commits to the draft, Esc cancels (the blur caused by Esc
 *     never commits),
 *   • validation comes from the caller — for My Profile that is the central
 *     config in src/lib/profileConfig,
 *   • the row keeps its height: the validation message floats below the row
 *     as an overlay instead of pushing the list down.
 *
 * The Quick View has its own column-aware editor (it picks by MasterColumn
 * type); this is the generic one My Profile and any plain-value screen uses.
 */

import { useId, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FieldEditorType = "text" | "tel" | "number" | "date" | "select" | "segmented";

export type FieldEditorOption = { value: string; label: string };

export function FieldEditor({
  label,
  type,
  value,
  options,
  validate,
  onCommit,
  onCancel,
  testId,
}: {
  label: string;
  type?: FieldEditorType;
  value: string;
  options?: FieldEditorOption[];
  validate?: (value: string) => string | null;
  onCommit: (value: string) => void;
  onCancel: () => void;
  testId?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);
  const hintId = useId();

  const commit = () => {
    const message = validate?.(draft) ?? null;
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    onCommit(draft.trim());
  };

  const cancel = () => {
    cancelled.current = true;
    setError(null);
    onCancel();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  const onBlur = () => {
    if (cancelled.current) return;
    commit();
  };

  if (type === "segmented" && options && options.length > 0) {
    return (
      <div className="relative flex items-center gap-2" data-testid={testId}>
        <div
          role="group"
          aria-label={label}
          className="flex gap-1 rounded-md border border-border/60 bg-muted/40 p-0.5"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={draft === opt.value}
              data-testid={testId ? `${testId}-${opt.value}` : undefined}
              onClick={() => {
                setDraft(opt.value);
                setError(null);
                onCommit(opt.value);
              }}
              className={cn(
                "min-h-8 rounded px-2.5 text-xs font-medium transition-colors",
                draft === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <FieldMessage error={error} hintId={hintId} />
      </div>
    );
  }

  if (type === "select" && options) {
    return (
      <div className="relative flex items-center gap-2" data-testid={testId}>
        <Select
          value={draft}
          onValueChange={(next) => {
            setDraft(next);
            setError(null);
            onCommit(next);
          }}
        >
          <SelectTrigger autoFocus className="h-8 min-w-40 text-sm" aria-label={label}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} disabled={opt.value === ""}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldMessage error={error} hintId={hintId} />
      </div>
    );
  }

  return (
    <div className="relative flex w-full items-center gap-2" data-testid={testId}>
      <Input
        autoFocus
        type={type === "number" ? "number" : "text"}
        inputMode={type === "tel" ? "tel" : undefined}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? hintId : undefined}
        className={cn("h-8 min-w-0 flex-1 text-sm", error && "border-destructive")}
      />
      <FieldMessage error={error} hintId={hintId} />
    </div>
  );
}

/** The message floats over the space below the row — never changes height. */
function FieldMessage({ error, hintId }: { error: string | null; hintId: string }) {
  return (
    <span
      id={hintId}
      role={error ? "alert" : undefined}
      className={cn(
        "pointer-events-none absolute top-full left-2 z-10 mt-0.5 max-w-[min(92%,28rem)] rounded-md border border-border/60 bg-popover px-2 py-1 text-[11px] leading-tight font-medium shadow-sm",
        error ? "text-destructive" : "hidden",
      )}
    >
      {error}
    </span>
  );
}

/**
 * A fixed-height (40 px) row: label left, value right, pencil on hover.
 * Clicking (or Enter/F2) turns the value into the editor; the height of the
 * row itself never changes.
 */
export function EditableRow({
  label,
  value,
  display,
  type,
  options,
  validate,
  onCommit,
  disabled,
  disabledReason,
  placeholder = "Not set",
  testId,
}: {
  label: string;
  /** The current (draft) value. */
  value: string;
  /** Optional richer display than the raw value (e.g. "English"). */
  display?: string;
  type?: FieldEditorType;
  options?: FieldEditorOption[];
  validate?: (value: string) => string | null;
  onCommit: (value: string) => void;
  disabled?: boolean;
  disabledReason?: string;
  placeholder?: string;
  testId?: string;
}) {
  const [editing, setEditing] = useState(false);

  const shown = display ?? value;
  const empty = !value.trim();

  return (
    <div
      className="group relative grid h-10 grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 border-b border-border/40 px-3 last:border-b-0"
      data-testid={testId}
      data-row-label={label}
    >
      <span className="min-w-0 truncate text-[13px] text-muted-foreground">{label}</span>

      <div className="min-w-0">
        {editing ? (
          <FieldEditor
            label={label}
            type={type}
            value={value}
            options={options}
            validate={validate}
            onCommit={(next) => {
              onCommit(next);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
            testId={testId ? `${testId}-editor` : undefined}
          />
        ) : disabled ? (
          <span
            className="block min-w-0 truncate text-right text-sm text-muted-foreground"
            data-tip={disabledReason}
          >
            {shown || placeholder}
          </span>
        ) : (
          <button
            type="button"
            data-testid={testId ? `${testId}-edit` : undefined}
            onClick={() => setEditing(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "F2") {
                e.preventDefault();
                setEditing(true);
              }
            }}
            aria-label={`${label}: ${shown || placeholder}. Edit`}
            className="flex h-10 w-full items-center justify-end gap-1.5 rounded-md px-1.5 text-right text-sm transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className={cn("min-w-0 truncate", empty && "text-muted-foreground/70 italic")}>
              {shown || placeholder}
            </span>
            <Pencil
              className="size-3 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-hidden
            />
          </button>
        )}
      </div>

      <span className="w-3" aria-hidden="true" />
    </div>
  );
}

/** Compact segmented control (options as buttons, one pressed). */
export function Segmented({
  label,
  value,
  options,
  onChange,
  testId,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  testId?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      data-testid={testId}
      className="inline-flex gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5"
    >
      {options.map((opt) => {
        const active = String(value) === String(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            data-testid={testId ? `${testId}-${opt.value}` : undefined}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex min-h-8 items-center gap-1 rounded-md px-3 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && <Check className="size-3" aria-hidden="true" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
