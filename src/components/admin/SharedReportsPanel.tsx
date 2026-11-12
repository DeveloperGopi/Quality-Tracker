/**
 * ADMIN → DOCUMENTS → SHARED REPORTS (Part 2.4 + Part 3.3).
 *
 * Two jobs:
 *  1. the "Document links in sheets" setting — On (default) / Require sign-in
 *     / Off — saved through the audited `facilities.setSetting`;
 *  2. the snapshot list: file name, cycle, opens, expiry, a server-side
 *     "Test link" (HEAD of the saved short URL) and Revoke. A generation-time
 *     QR failure is called out on the row.
 */
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ExternalLink, Loader2, QrCode, ShieldOff, Wifi } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { istStampText, SHARE_SETTINGS_KEYS, type DocumentLinkMode } from "@/lib/shareLink";
import { cn } from "@/lib/utils";

const MODES: { value: DocumentLinkMode; label: string; hint: string }[] = [
  { value: "on", label: "On", hint: "Anyone with the printed sheet can open a document." },
  {
    value: "signin",
    label: "Require sign-in",
    hint: "The link asks for a staff sign-in before the file opens.",
  },
  { value: "off", label: "Off", hint: "Documents print without an Open link." },
];

export function SharedReportsPanel() {
  const settings = useQuery(api.facilities.getAppSettings, {});
  const rows = useQuery(api.share.list, {});
  const setSetting = useMutation(api.facilities.setSetting);
  const testLink = useAction(api.share.testLink);
  const revoke = useMutation(api.share.revoke);
  const [mode, setMode] = useState<DocumentLinkMode | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const current = (mode ??
    ((settings?.settings as Record<string, unknown> | undefined)?.[
      SHARE_SETTINGS_KEYS.documentLinkMode
    ] as DocumentLinkMode | undefined) ??
    "on") as DocumentLinkMode;

  const saveMode = async (next: DocumentLinkMode) => {
    setMode(next);
    try {
      await setSetting({ key: SHARE_SETTINGS_KEYS.documentLinkMode, value: next });
      toast.success(`Document links in sheets: ${next === "off" ? "Off" : next === "signin" ? "Require sign-in" : "On"}`);
    } catch (err) {
      setMode(null);
      toast.error(err instanceof Error ? err.message : "The setting could not be saved");
    }
  };

  const test = async (id: string) => {
    setBusy(`test:${id}`);
    try {
      const res = await testLink({ shareId: id });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The link could not be tested");
    } finally {
      setBusy(null);
    }
  };

  const doRevoke = async (id: string) => {
    if (!window.confirm("Revoke this link? The printed QR code and every document link stop working.")) {
      return;
    }
    setBusy(`revoke:${id}`);
    try {
      await revoke({ shareId: id });
      toast.success("Link revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The link could not be revoked");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="glass space-y-4 rounded-xl border border-border/60 p-4">
      <header>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <QrCode className="size-4 text-primary" /> Shared reports &amp; document links
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The QR code on a printed sheet opens a stored copy of that exact sheet. “Open” links
          printed next to a document use their own token, pinned to the printed version.
        </p>
      </header>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold">Document links in sheets</p>
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={current === m.value}
              onClick={() => void saveMode(m.value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                current === m.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-background hover:bg-accent",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {MODES.find((m) => m.value === current)?.hint}
        </p>
      </div>

      {rows === undefined ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
          No shared copies yet. Print a facility sheet with the QR code on to create one.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-1.5 pr-3 font-medium">File</th>
                <th className="py-1.5 pr-3 font-medium">Cycle</th>
                <th className="py-1.5 pr-3 font-medium">Generated</th>
                <th className="py-1.5 pr-3 font-medium">Opens</th>
                <th className="py-1.5 pr-3 font-medium">Status</th>
                <th className="py-1.5 pr-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="max-w-[260px] truncate py-1.5 pr-3">{r.fileName}</td>
                  <td className="py-1.5 pr-3">{r.cycleNumber ? `#${r.cycleNumber}` : "—"}</td>
                  <td className="py-1.5 pr-3">{istStampText(r.generatedAt)}</td>
                  <td className="py-1.5 pr-3">{r.openCount}</td>
                  <td className="py-1.5 pr-3">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        r.revokedAt
                          ? "bg-muted text-muted-foreground"
                          : r.expired
                            ? "bg-amber-500/15 text-amber-700"
                            : "bg-emerald-500/15 text-emerald-700",
                      )}
                    >
                      {r.revokedAt ? "Revoked" : r.expired ? "Expired" : r.stored ? "Active" : "Pending"}
                    </span>
                    {r.qrCheckFailed && (
                      <span className="ml-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        QR check failed
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 gap-1 px-1.5 text-[11px]"
                        disabled={busy === `test:${r.id}`}
                        onClick={() => void test(r.id)}
                      >
                        {busy === `test:${r.id}` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Wifi className="size-3" />
                        )}
                        Test link
                      </Button>
                      {!r.revokedAt && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
                          disabled={busy === `revoke:${r.id}`}
                          onClick={() => void doRevoke(r.id)}
                        >
                          <ShieldOff className="size-3" /> Revoke
                        </Button>
                      )}
                      <a
                        href={`/r/${r.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium underline-offset-2 hover:underline"
                      >
                        <ExternalLink className="size-3" /> Open
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
