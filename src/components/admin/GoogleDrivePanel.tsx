/**
 * SETTINGS → GOOGLE DRIVE (State Admin only).
 *
 * Three sections, in the order the admin needs them:
 *
 *   1. Connection details — the Client ID / secret / app address, entered here
 *      by a State Admin, plus the six-row setup checklist and the redirect URI
 *      helper (DriveCredentialsCard).
 *   2. Connection — Connect (OAuth + PKCE), Test upload, document self-test,
 *      storage, root folder check, disconnect.
 *   3. Storage settings + health — unchanged behaviour, still saved here.
 *
 * Nothing secret reaches this file: the server sends booleans, counts and
 * labels only. The page itself makes NO Google call on open — storage and the
 * self-test run only when the admin presses the button (the self-test also runs
 * once automatically, server-side, right after connecting).
 */

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  ExternalLink,
  HardDrive,
  Loader2,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/convex/_generated/api";
import { DriveCredentialsCard } from "@/components/admin/DriveCredentialsCard";
import {
  DEFAULT_DRIVE_SETTINGS,
  getUploadState,
  resolveDriveSettings,
  uploadBlockedSentence,
  uploadPausedDetail,
  type DriveSettings,
  type UploadState,
} from "@/lib/driveSettings";
import { driveOauthNotice, type DriveOauthNotice } from "@/lib/driveCredentials";
import { cn } from "@/lib/utils";

const MB = 1024 * 1024;

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(0)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatWhen(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GoogleDrivePanel() {
  const state = useQuery(api.drive.getDriveAdminState, {});
  const credentials = useQuery(api.driveCredentials.getDriveCredentialsState, {});
  const health = useQuery(api.driveJobs.healthReport, {});
  const saveSettings = useMutation(api.drive.saveDriveSettings);
  const disconnect = useMutation(api.drive.disconnectDrive);
  const consent = useAction(api.drive.driveConsentState);
  const testUpload = useAction(api.drive.testUpload);
  const selfTest = useAction(api.drive.runDocumentSelfTest);
  const refreshStorage = useAction(api.drive.refreshStorage);
  const checkRoot = useAction(api.drive.verifyRootFolder);

  const [draft, setDraft] = useState<DriveSettings>(DEFAULT_DRIVE_SETTINGS);
  const [busy, setBusy] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [rootCheck, setRootCheck] = useState<{ ok: boolean; message: string } | null>(null);
  const [notice, setNotice] = useState<DriveOauthNotice | null>(null);
  /** "Resume uploads" asks once — resuming is a shared, audited action. */
  const [confirmResume, setConfirmResume] = useState(false);

  // Re-seed the draft whenever the server's settings arrive or change (first
  // load, save from another tab). React's "adjust state when props change"
  // pattern — not an effect — so an edit in flight is never clobbered by a
  // re-render.
  const [seededSettings, setSeededSettings] = useState(state?.settings ?? null);
  if (state && state.settings !== seededSettings) {
    setSeededSettings(state.settings);
    setDraft(resolveDriveSettings(state.settings));
  }

  // Returning from Google's consent screen (?drive=connected|denied|…).
  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("drive");
    const parsed = driveOauthNotice(flag);
    if (!parsed) return;
    setNotice(parsed);
    if (parsed.tone === "ok") toast.success(parsed.title);
    else if (parsed.tone === "error") toast.error(parsed.title);
    else toast(parsed.title);
    const url = new URL(window.location.href);
    url.searchParams.delete("drive");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const connection = state?.connection ?? null;
  const connected = !!connection?.connected;
  const canConnect = credentials?.canConnect ?? false;

  const storagePercent =
    connection?.storageLimit && connection.storageLimit > 0
      ? Math.min(100, Math.round(((connection.storageUsed ?? 0) / connection.storageLimit) * 100))
      : null;

  const selfTestRows = credentials?.selfTest.rows ?? [];

  /* THE single upload gate — the same `getUploadState` the document card, the
     Storage chip and the server's beginUpload rejection read, so this page can
     never say "allowed" while an upload is refused (or vice versa). */
  const uploadState: UploadState = getUploadState({
    settings: resolveDriveSettings(state?.settings),
    connected,
    revoked: !!connection && !connection.connected,
    storageFull: storagePercent != null && storagePercent >= 100,
  });

  /** Only the mutation's own arguments cross the wire — DriveSettings carries
   *  read-only bookkeeping (pausedAt / pausedBy / …) the validator rejects.
   *  `resumeAt: null` is sent as 0, which the server resolves back to null
   *  ("clear the auto-resume time"). */
  const DRIVE_SETTING_ARGS = [
    "rootFolderId",
    "maxMb",
    "perTypeMb",
    "retainedDays",
    "keepVersions",
    "nightlyReconciliation",
    "lowSpacePercent",
    "paused",
    "pauseReason",
    "resumeAt",
  ] as const;
  const toMutationArgs = (patch: Partial<DriveSettings>) => {
    const out: Record<string, unknown> = {};
    for (const key of DRIVE_SETTING_ARGS) {
      const value = (patch as Record<string, unknown>)[key];
      if (value === undefined || value === null) continue;
      out[key] = key === "resumeAt" && !(Number(value) > 0) ? 0 : value;
    }
    return out as Parameters<typeof saveSettings>[0];
  };

  const save = async (patch: Partial<DriveSettings>) => {
    setBusy("save");
    try {
      const next = await saveSettings(toMutationArgs(patch));
      setDraft(resolveDriveSettings(next));
      setConfirmResume(false);
      toast.success("Drive settings saved");
      setRootCheck(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(null);
    }
  };

  const connect = async () => {
    setBusy("connect");
    try {
      // The browser's own origin becomes the OAuth redirect host, so Google
      // always returns to THIS app instance's /drive/oauth/callback route —
      // the same value the redirect box below shows for copying.
      const { url } = await consent({
        appOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      window.location.assign(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the Google consent");
      setBusy(null);
    }
  };

  const runTest = async () => {
    setBusy("test");
    setTestResult(null);
    try {
      const result = await testUpload({});
      setTestResult(result);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Test upload failed";
      setTestResult({ ok: false, message });
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const runSelfTest = async () => {
    setBusy("selftest");
    try {
      const result = await selfTest({});
      toast[result.ok ? "success" : "error"](
        result.ok ? "Every document type uploaded and read back" : "The self-test found a problem",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The self-test could not run");
    } finally {
      setBusy(null);
    }
  };

  const verifyFolder = async () => {
    setBusy("folder");
    setRootCheck(null);
    try {
      const result = await checkRoot({});
      setRootCheck({ ok: result.ok, message: result.message });
    } catch (err) {
      setRootCheck({ ok: false, message: err instanceof Error ? err.message : "Could not read the folder" });
    } finally {
      setBusy(null);
    }
  };

  const refresh = async () => {
    setBusy("storage");
    try {
      const quota = await refreshStorage({});
      toast.success(`Drive: ${formatBytes(quota.used)} of ${formatBytes(quota.limit)} used`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read Drive storage");
    } finally {
      setBusy(null);
    }
  };

  const onDisconnect = async () => {
    if (!window.confirm("Disconnect Google Drive? Uploads stop until you reconnect. Stored documents stay readable."))
      return;
    setBusy("disconnect");
    try {
      await disconnect({});
      toast.success("Google Drive disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setBusy(null);
    }
  };

  if (!state || !credentials) {
    return (
      <div className="glass flex items-center gap-2 rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading Drive settings…
      </div>
    );
  }

  return (
    <div className="space-y-4" data-admin-anchor="drive">
      {notice && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-xl border p-3 text-xs",
            notice.tone === "ok"
              ? "border-emerald-300/70 bg-emerald-50 text-emerald-900"
              : notice.tone === "info"
                ? "border-sky-300/70 bg-sky-50 text-sky-900"
                : "border-rose-300/70 bg-rose-50 text-rose-900",
          )}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{notice.title}</p>
            <p className="mt-0.5 leading-relaxed">{notice.detail}</p>
            {notice.showChecklist && (
              <p className="mt-1 text-[11px] font-medium">The checklist above shows exactly which step is missing.</p>
            )}
          </div>
          <button type="button" className="shrink-0 rounded px-1.5 py-0.5 font-medium hover:bg-black/5" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* ---- 1. Credentials (entered here) ---- */}
      <DriveCredentialsCard view={credentials} connected={connected} onChanged={() => setNotice(null)} />

      {/* ---- 2. Connection ---- */}
      <section className="glass rounded-xl border border-border/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                connected
                  ? "border-emerald-300/60 bg-emerald-50 text-emerald-700"
                  : "border-amber-300/60 bg-amber-50 text-amber-700",
              )}
            >
              <Cloud className="size-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">Google Drive</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {connected
                  ? `Connected${connection?.accountEmail ? ` as ${connection.accountEmail}` : ""} · OAuth (drive.file)`
                  : "Not connected — documents cannot be uploaded until Drive is connected"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Last checked {formatWhen(connection?.lastCheckedAt)} · Last error{" "}
                {connection?.lastError ? connection.lastError : "none"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => void connect()}
              disabled={busy === "connect" || !canConnect}
              data-guide-target="drive-connect"
              data-tip={canConnect ? undefined : "Save the four checklist items above first"}
            >
              <PlugZap className="mr-1.5 size-4" />
              {busy === "connect" ? "Opening Google…" : connected ? "Reconnect" : "Connect Google Drive"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void runTest()} disabled={!connected || busy === "test"}>
              {busy === "test" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <UploadCloud className="mr-1.5 size-4" />}
              Test upload
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void runSelfTest()}
              disabled={!connected || busy === "selftest"}
            >
              {busy === "selftest" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <ShieldCheck className="mr-1.5 size-4" />}
              Run document self-test
            </Button>
            <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={!connected || busy === "storage"}>
              {busy === "storage" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <RefreshCw className="mr-1.5 size-4" />}
              Refresh storage
            </Button>
            {connected && (
              <Button size="sm" variant="ghost" onClick={() => void onDisconnect()} disabled={busy === "disconnect"}>
                Disconnect
              </Button>
            )}
          </div>
        </div>

        {connection?.lastError && (
          <div className="mt-3 rounded-lg border border-red-300/70 bg-red-50 p-3 text-xs text-red-900">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="size-3.5" /> Document storage needs attention
            </p>
            <p className="mt-1">{connection.lastError}</p>
            <p className="mt-1 text-red-800/80">
              Uploads are blocked while this lasts. Pending uploads stay queued for 24 hours and retry automatically
              after you reconnect.
            </p>
          </div>
        )}

        {testResult && (
          <p
            className={cn(
              "mt-3 flex items-center gap-1.5 rounded-lg border p-2 text-xs",
              testResult.ok
                ? "border-emerald-300/70 bg-emerald-50 text-emerald-900"
                : "border-red-300/70 bg-red-50 text-red-900",
            )}
          >
            {testResult.ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
            {testResult.message}
          </p>
        )}

        {/* Document self-test (runs once automatically after connecting) */}
        {selfTestRows.length > 0 && (
          <div className="mt-3 rounded-lg border border-border/60 bg-background/60 p-2.5">
            <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              Document self-test
              <span className="font-normal text-muted-foreground">
                {formatWhen(credentials.selfTest.at)}
                {credentials.selfTest.ok === true
                  ? ` · all ${selfTestRows.length} passed`
                  : credentials.selfTest.ok === false
                    ? " · needs attention"
                    : ""}
              </span>
            </p>
            <ul className="mt-1 grid gap-1 sm:grid-cols-2">
              {selfTestRows.map((row) => (
                <li key={row.key} className="flex items-start gap-1.5 text-[11px]">
                  {row.ok ? (
                    <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-3 shrink-0 text-rose-600" />
                  )}
                  <span className="min-w-0">
                    <span className="font-medium">{row.label}</span>{" "}
                    <span className="text-muted-foreground">— {row.message}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Storage used / limit */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <HardDrive className="size-3.5" /> Drive storage
            </span>
            <span>
              {formatBytes(connection?.storageUsed)} of {formatBytes(connection?.storageLimit)}
              {storagePercent != null ? ` · ${storagePercent}%` : ""}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                storagePercent != null && storagePercent >= draft.lowSpacePercent ? "bg-red-500" : "bg-primary",
              )}
              style={{ width: `${storagePercent ?? 0}%` }}
            />
          </div>
          {storagePercent != null && storagePercent >= draft.lowSpacePercent && (
            <p className="mt-1 text-xs text-red-700">
              Drive is {storagePercent}% full (warning at {draft.lowSpacePercent}%). Free space before a large batch.
            </p>
          )}
        </div>
      </section>

      {/* ---- 3. Storage settings ---- */}
      <section className="glass rounded-xl border border-border/60 p-4">
        <h3 className="text-sm font-semibold">Storage settings</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Applies to new uploads only. Existing documents keep their stored type and size.
        </p>

        {/* ONE upload gate, shown here with its action (task 1.2 / 1.3). */}
        <div
          className={cn(
            "mt-3 flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
            uploadState.allowed
              ? "border-emerald-300/70 bg-emerald-50 text-emerald-800"
              : "border-amber-300/70 bg-amber-50 text-amber-900",
          )}
          data-testid="drive-upload-state"
          role="status"
        >
          {uploadState.allowed ? (
            <>
              <CheckCircle2 className="size-3.5 shrink-0" /> Uploads allowed — the Storage chip, the
              uploader and this page read this same state.
            </>
          ) : (
            <>
              <AlertTriangle className="size-3.5 shrink-0" />
              <span className="min-w-0 flex-1">
                {uploadState.reason === "paused"
                  ? uploadPausedDetail(uploadState)
                  : uploadBlockedSentence(uploadState)}
              </span>
              {uploadState.reason === "paused" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0"
                  disabled={busy === "save"}
                  onClick={() => {
                    if (!confirmResume) {
                      setConfirmResume(true);
                      return;
                    }
                    void save({ paused: false });
                  }}
                  data-testid="drive-resume-uploads"
                >
                  {busy === "save" ? (
                    <Loader2 className="mr-1 size-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-1 size-3.5" />
                  )}
                  {confirmResume ? "Click again to confirm" : "Resume uploads"}
                </Button>
              )}
            </>
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="drive-root" className="text-xs">
              Root folder ID
            </Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Input
                id="drive-root"
                className="min-w-0 flex-1 font-mono text-xs"
                value={draft.rootFolderId}
                placeholder="Paste the folder id from the Drive URL (…/folders/<id>)"
                onChange={(e) => setDraft((d) => ({ ...d, rootFolderId: e.target.value }))}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 shrink-0"
                disabled={!connected || busy === "folder"}
                onClick={() => void verifyFolder()}
              >
                {busy === "folder" ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 size-3.5" />}
                Check folder
              </Button>
            </div>
            {rootCheck && (
              <p className={cn("mt-1 text-[11px] font-medium", rootCheck.ok ? "text-emerald-700" : "text-rose-700")}>
                {rootCheck.message}
              </p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Created folders: <span className="font-mono">Facility Documents</span> / Block / NIN - Facility /
              document type, plus <span className="font-mono">_incoming</span> and{" "}
              <span className="font-mono">_trash-review</span>. Connecting creates them automatically when this is
              empty.
            </p>
          </div>

          <div>
            <Label htmlFor="drive-max" className="text-xs">
              Maximum file size (MB)
            </Label>
            <Input
              id="drive-max"
              type="number"
              min={1}
              max={25}
              className="mt-1"
              value={draft.maxMb}
              onChange={(e) => setDraft((d) => ({ ...d, maxMb: Number(e.target.value) }))}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Hard cap 25 MB; NQAS Result allows 25 MB.</p>
          </div>

          <div>
            <Label htmlFor="drive-retain" className="text-xs">
              Keep removed files (days)
            </Label>
            <Input
              id="drive-retain"
              type="number"
              min={1}
              max={365}
              className="mt-1"
              value={draft.retainedDays}
              onChange={(e) => setDraft((d) => ({ ...d, retainedDays: Number(e.target.value) }))}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Removed documents wait in <span className="font-mono">_trash-review</span> before deletion.
            </p>
          </div>

          <div>
            <Label htmlFor="drive-low" className="text-xs">
              Low-space warning (%)
            </Label>
            <Input
              id="drive-low"
              type="number"
              min={50}
              max={99}
              className="mt-1"
              value={draft.lowSpacePercent}
              onChange={(e) => setDraft((d) => ({ ...d, lowSpacePercent: Number(e.target.value) }))}
            />
          </div>

          <div className="space-y-2">
            <ToggleLine
              label="Keep all versions"
              hint="Replaced files move to _versions instead of being deleted."
              checked={draft.keepVersions}
              onChange={(v) => setDraft((d) => ({ ...d, keepVersions: v }))}
            />
            <ToggleLine
              label="Nightly reconciliation"
              hint="Checks every current file in Drive and flags missing ones."
              checked={draft.nightlyReconciliation}
              onChange={(v) => setDraft((d) => ({ ...d, nightlyReconciliation: v }))}
            />
            <ToggleLine
              label="Pause uploads"
              hint="Keeps existing files readable; blocks new uploads. Everyone sees who paused them and since when."
              checked={draft.paused}
              onChange={(v) => setDraft((d) => ({ ...d, paused: v }))}
            />
            {draft.paused && (
              <div className="grid gap-2 rounded-lg border border-amber-300/60 bg-amber-50/60 p-2 sm:grid-cols-2" data-testid="drive-pause-options">
                <div>
                  <Label htmlFor="drive-pause-reason" className="text-xs">
                    Reason (optional)
                  </Label>
                  <Input
                    id="drive-pause-reason"
                    className="mt-1"
                    placeholder="e.g. re-connecting the department Drive"
                    value={draft.pauseReason}
                    onChange={(e) => setDraft((d) => ({ ...d, pauseReason: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="drive-pause-resume" className="text-xs">
                    Resume automatically (optional)
                  </Label>
                  <Input
                    id="drive-pause-resume"
                    type="datetime-local"
                    className="mt-1"
                    value={toLocalInputValue(draft.resumeAt)}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        resumeAt: e.target.value ? new Date(e.target.value).getTime() : null,
                      }))
                    }
                  />
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Empty = until further notice. Past this time uploads run again without a click.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void save(draft)} disabled={busy === "save"}>
            {busy === "save" ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <ShieldCheck className="mr-1.5 size-4" />}
            Save storage settings
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(resolveDriveSettings(state.settings))}>
            Reset
          </Button>
        </div>
      </section>

      {/* ---- 4. Health ---- */}
      <section className="glass rounded-xl border border-border/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Document storage health</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {health?.lastRun
                ? `Last run ${formatWhen(health.lastRun.finishedAt ?? health.lastRun.startedAt)} · ${health.lastRun.checked} checked · ${health.lastRun.missing} missing · ${health.lastRun.orphans} orphaned`
                : "No reconciliation run yet."}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {state.counts.current} documents · {state.counts.missing} flagged
          </span>
        </div>

        {health?.missing.length ? (
          <ul className="mt-3 space-y-1.5">
            {health.missing.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
              >
                <span className="truncate">
                  <span className="font-medium">{doc.docKey.replace(/_/g, " ")}</span> · {doc.originalName}
                </span>
                <span className="shrink-0">File missing in Drive</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-600" /> Every current document is present in Drive.
          </p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          A missing file is flagged, never auto-deleted — the database row stays and the document appears in Needs
          attention.
        </p>
      </section>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ExternalLink className="size-3" /> Files are private: the app never shares a Drive file or exposes a Drive
        link. Downloads stream through this app after a role and scope check.
      </p>
    </div>
  );
}

/** ms → the value an `datetime-local` input wants (local time, no zone). */
function toLocalInputValue(ts: number | null): string {
  if (!ts || !Number.isFinite(ts)) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ToggleLine({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-xs font-medium">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </label>
  );
}
