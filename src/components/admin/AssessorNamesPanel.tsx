/**
 * DATA CHECKS → Assessor names ending in a designation.
 * Read-only list + one confirmed split per row (audited). Nothing is
 * changed until the State Admin presses Apply.
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";

export function AssessorNamesPanel() {
  const rows = useQuery(api.assessorChecks.assessorSplitAudit, {});
  const apply = useMutation(api.assessorChecks.applyAssessorSplit);
  const [busy, setBusy] = useState<string | null>(null);
  const list = rows ?? [];

  const split = async (row: (typeof list)[number]) => {
    setBusy(row.saId + ":" + row.slot);
    try {
      await apply({
        saId: row.saId as never,
        slot: row.slot,
        name: row.proposedName,
        designation: row.proposedDesignation,
        currentName: row.currentName,
      });
      toast.success("Name and designation split", {
        description: `${row.currentName} → ${row.proposedName} · ${row.proposedDesignation}`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not split the name");
    } finally {
      setBusy(null);
    }
  };

  if (rows === undefined) return null;
  if (list.length === 0) {
    return (
      <section className="rounded-xl border border-border/60 bg-background/60 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <UserRoundCheck className="size-4" /> Assessor names
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Every assessor name is already separate from its designation.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border/60 bg-background/60">
      <header className="border-b border-border/60 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <UserRoundCheck className="size-4" /> Assessor names that end in a designation
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Nothing changes until you press Apply. The split is written to the
          assessment and recorded in the audit log.
        </p>
      </header>
      <ul className="divide-y divide-border/50">
        {list.map((row) => {
          const key = `${row.saId}:${row.slot}`;
          return (
            <li
              key={key}
              className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1">
                <span className="font-medium">{row.currentName}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  → {row.proposedName} · designation {row.proposedDesignation}
                </span>
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === key}
                onClick={() => void split(row)}
              >
                {busy === key ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : null}
                Apply split
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
