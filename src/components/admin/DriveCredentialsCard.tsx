/**
 * SETTINGS → GOOGLE DRIVE → CONNECTION DETAILS (State Admin only).
 *
 * The four values the Drive layer needs, entered here instead of the hosting
 * panel. Everything the card renders is already secret-free: the server sends
 * the Client ID and the app address, and only `saved: true/false` for the
 * Client secret — the value itself never comes back, so "Replace" is the only
 * way to change it.
 *
 * Every change is confirmed with the admin's password (re-verified server
 * side, 5 attempts / 15 minutes) and audited. Saving is optimistic-free: the
 * card waits for the server, then asks the panel to re-read the state.
 */

import { useMemo, useState } from "react";
import { useAction, useMutation } from "convex/react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Lock,
  PlugZap,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import {
  redirectUriFor,
  validateAppOrigin,
  validateClientId,
  validateClientSecret,
  type DriveCredentialsView,
} from "@/lib/driveCredentials";
import { cn } from "@/lib/utils";

type Pending = "save" | "rotate" | "clear" | null;

function formatWhen(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Status({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-2 py-1" data-drive-check={label}>
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
          ok
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-amber-300 bg-amber-50 text-amber-800",
        )}
        aria-hidden
      >
        {ok ? "✓" : "✗"}
      </span>
      <span className="min-w-0">
        <span className={cn("block text-xs font-medium", ok ? "text-foreground" : "text-foreground")}>{label}</span>
        {!ok && <span className="block text-[11px] leading-snug text-muted-foreground">{hint}</span>}
      </span>
    </li>
  );
}

export function DriveCredentialsCard({
  view,
  connected,
  onChanged,
}: {
  view: DriveCredentialsView;
  connected: boolean;
  onChanged: () => void;
}) {
  const save = useAction(api.driveCredentials.saveDriveCredentials);
  const testCredentials = useAction(api.driveCredentials.testDriveCredentials);
  const rotate = useAction(api.driveCredentials.rotateDriveKey);
  const clear = useAction(api.driveCredentials.clearDriveCredentials);
  const dismiss = useMutation(api.driveCredentials.dismissNotice);

  const [clientId, setClientId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [replacingSecret, setReplacingSecret] = useState(false);
  const [appOrigin, setAppOrigin] = useState<string | null>(null);

  const idValue = clientId ?? view.clientId.value ?? "";
  const originValue = appOrigin ?? view.appOrigin.value ?? "";
  const originCheck = useMemo(
    () => (originValue ? validateAppOrigin(originValue, { allowLocalhost: true }) : null),
    [originValue],
  );
  const idCheck = useMemo(() => (idValue ? validateClientId(idValue) : null), [idValue]);

  const idDirty = clientId !== null && clientId !== (view.clientId.value ?? "");
  const secretDirty = clientSecret.trim().length > 0;
  const originDirty = appOrigin !== null && appOrigin !== (view.appOrigin.value ?? "");
  const dirty = [idDirty && "Client ID", secretDirty && "Client secret", originDirty && "App address"].filter(
    Boolean,
  ) as string[];

  const [pending, setPending] = useState<Pending>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const anyManagedByEnv = view.clientId.managedByEnv || view.clientSecret.managedByEnv || view.appOrigin.managedByEnv;
  // The redirect URI follows the address the admin is browsing from RIGHT
  // NOW: the callback is a frontend route on the app host, and the Connect
  // flow sends this exact value to Google — displayed == used.
  const liveOrigin = typeof window !== "undefined" ? window.location.origin : null;
  const redirect = redirectUriFor(
    liveOrigin ?? (originCheck?.ok ? originCheck.value : view.appOrigin.value ?? null),
  );

  const resetDraft = () => {
    setClientId(null);
    setClientSecret("");
    setReplacingSecret(false);
    setAppOrigin(null);
    setError(null);
    setTestResult(null);
  };

  const start = (action: Pending) => {
    setError(null);
    setPassword("");
    setPending(action);
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      if (pending === "save") {
        await save({
          clientId: idDirty ? idValue : undefined,
          clientSecret: secretDirty ? clientSecret.trim() : undefined,
          appOrigin: originDirty ? originValue : undefined,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
          password,
        });
        resetDraft();
        setPending(null);
        onChanged();
        toast.success("Credentials saved");
        // The slower Google check runs AFTER the save, so storing never waits
        // on the network (and saving works offline).
        try {
          const check = await testCredentials({});
          setTestResult(check);
          if (check.ok) toast.success(check.message);
          else toast.error(check.message);
        } catch {
          setTestResult(null);
        }
      } else if (pending === "rotate") {
        const result = await rotate({ password });
        toast.success(
          result.requiresReconnect
            ? "Key rotated. The stored Google token could not be re-encrypted — reconnect Drive."
            : "Encryption key rotated.",
        );
        setPending(null);
        onChanged();
      } else {
        await clear({ password });
        toast.success("Saved credentials cleared.");
        setPending(null);
        onChanged();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not complete the change";
      setError(message);
    } finally {
      setBusy(false);
      setPassword("");
    }
  };

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirect);
      setCopied(true);
      toast.success("Redirect URI copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the text and copy it manually.");
    }
  };

  return (
    <section className="glass rounded-xl border border-border/60 p-4" data-drive-credentials>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="size-4 text-primary" /> Connection details
          </h3>
          <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
            Entered here and stored on the server — the Client secret is encrypted and never shown again. Only a State
            Admin can open this card.
          </p>
        </div>
        <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          State Admin only
        </span>
      </div>

      {/* ---- Checklist ---- */}
      <div className="mt-3 grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 sm:grid-cols-2">
        <ul className="min-w-0">
          {view.checklist.slice(0, 3).map((row) => (
            <Status key={row.key} ok={row.ok} label={row.label} hint={row.hint} />
          ))}
        </ul>
        <ul className="min-w-0">
          {view.checklist.slice(3).map((row) => (
            <Status key={row.key} ok={row.ok} label={row.label} hint={row.hint} />
          ))}
        </ul>
      </div>

      {view.missing.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="size-3.5" /> Server secrets missing: {view.missing.join(", ")}
          </p>
          <p className="mt-1">Fill in the missing value(s) below and save — no restart or redeploy is needed.</p>
        </div>
      )}

      {view.notices.length > 0 && (
        <ul className="mt-3 space-y-1">
          {view.notices.map((notice) => (
            <li
              key={notice.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5 text-[11px] text-muted-foreground"
            >
              <span className="truncate">
                {notice.message} · {formatWhen(notice.at)}
              </span>
              <button
                type="button"
                className="shrink-0 rounded px-1.5 py-0.5 font-medium hover:bg-muted"
                onClick={() => void dismiss({ noticeId: notice.id as never }).then(onChanged)}
              >
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ---- Fields ---- */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="drive-client-id" className="text-xs">
            Google Client ID
          </Label>
          <Input
            id="drive-client-id"
            className="mt-1 font-mono text-xs"
            autoComplete="off"
            spellCheck={false}
            value={idValue}
            placeholder="1234567890-abc123.apps.googleusercontent.com"
            onChange={(e) => setClientId(e.target.value)}
          />
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {view.clientId.managedByEnv ? (
              <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                From the server environment — saving here overrides it
              </span>
            ) : view.clientId.source === "admin" ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Check className="size-3" /> Saved ✓ · updated {formatWhen(view.clientId.savedAt)}
                {view.clientId.savedByName ? ` by ${view.clientId.savedByName}` : ""}
              </span>
            ) : (
              "Not saved yet."
            )}
            <span className="text-muted-foreground/70">
              · source:{" "}
              {view.clientId.managedByEnv
                ? "Environment"
                : view.clientId.source === "admin"
                  ? "Saved in Admin"
                  : "missing"}
            </span>
            {idValue && idCheck && !idCheck.ok && <span className="text-rose-700">{idCheck.error}</span>}
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="drive-client-secret" className="text-xs">
            Google Client secret
          </Label>
          {view.clientSecret.saved && !replacingSecret && !secretDirty ? (
            <div className="mt-1 flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <Lock className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-emerald-700">
                Saved ✓
                {view.clientSecret.savedAt ? ` · updated ${formatWhen(view.clientSecret.savedAt)}` : ""}
                {view.clientSecret.savedByName ? ` by ${view.clientSecret.savedByName}` : ""}
                {view.clientSecret.source === "env" ? " · from the server environment" : ""}
              </span>
              <span className="text-[11px] text-muted-foreground/80">
                source: {view.clientSecret.managedByEnv ? "Environment" : "Saved in Admin"}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto h-7 px-2 text-xs"
                onClick={() => {
                  setReplacingSecret(true);
                  setClientSecret("");
                }}
              >
                Replace
              </Button>
            </div>
          ) : (
            <>
              <Input
                id="drive-client-secret"
                type="password"
                className="mt-1 font-mono text-xs"
                autoComplete="new-password"
                spellCheck={false}
                value={clientSecret}
                placeholder={view.clientSecret.saved ? "Paste the new secret" : "Paste the Client secret"}
                onChange={(e) => setClientSecret(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {view.clientSecret.managedByEnv
                  ? "Using the value from the server environment. A secret saved here takes precedence."
                  : "Write-only: it is encrypted (AES-256-GCM) before storage and is never returned by any API."}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                Client secret source:{" "}
                {view.clientSecret.managedByEnv
                  ? "Environment"
                  : view.clientSecret.source === "admin"
                    ? "Saved in Admin"
                    : "missing"}
              </p>
            </>
          )}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="drive-app-origin" className="text-xs">
            App address (APP_ORIGIN)
          </Label>
          <Input
            id="drive-app-origin"
            className="mt-1 font-mono text-xs"
            value={originValue}
            placeholder="https://nqas.example.gov.in"
            onChange={(e) => setAppOrigin(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            {originCheck && !originCheck.ok ? (
              <span className="text-rose-700">{originCheck.error}</span>
            ) : (
              <>
                The https address this app is served from, with no path or trailing slash. The redirect URI below
                follows the address you are browsing from.{" "}
                <span className="text-muted-foreground/70">
                  (source:{" "}
                  {view.appOrigin.managedByEnv
                    ? "Environment"
                    : view.appOrigin.source === "admin"
                      ? "Saved in Admin"
                      : "missing"})
                </span>
              </>
            )}
          </p>
          <div className="mt-2 rounded-lg border border-border/60 bg-background/60 p-2">
            <p className="text-[11px] text-muted-foreground">
              Add this under <span className="font-medium">Authorized redirect URIs</span> in Google Cloud. It is the
              address you are using right now — copy it whenever you open the app from a different domain:
            </p>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-muted/60 px-2 py-1 font-mono text-[11px]">
                {redirect}
              </code>
              <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 px-2" onClick={() => void copyRedirect()}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                <span className="ml-1 text-xs">Copy</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Encryption key ---- */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
        <KeyRound className="size-3.5 text-muted-foreground" />
        <span className="text-xs">
          Encryption key:{" "}
          {view.encryptionKey.present ? (
            <span className="font-medium text-emerald-700">
              created ✓
              {view.encryptionKey.createdAt ? ` · ${formatWhen(view.encryptionKey.createdAt)}` : ""}
              {view.encryptionKey.rotatedAt ? ` · rotated ${formatWhen(view.encryptionKey.rotatedAt)}` : ""}
            </span>
          ) : (
            <span className="text-amber-800">not created yet — saving the credentials creates it</span>
          )}
        </span>
        {view.encryptionKey.managedByEnv && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">Managed by environment</span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!view.clientId.value || !view.clientSecret.saved || busy}
            onClick={() => {
              setBusy(true);
              void testCredentials({})
                .then((result) => {
                  setTestResult(result);
                  if (result.ok) toast.success(result.message);
                  else toast.error(result.message);
                })
                .catch(() => toast.error("The credential test could not run"))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? <Loader2 className="mr-1 size-3 animate-spin" /> : <PlugZap className="mr-1 size-3" />}
            Test credentials
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={view.encryptionKey.managedByEnv || !view.encryptionKey.present}
            onClick={() => start("rotate")}
          >
            <RefreshCw className="mr-1 size-3" /> Rotate key
          </Button>
        </div>
      </div>

      {/* ---- Password confirmation ---- */}
      {pending && (
        <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3" data-drive-confirm>
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Lock className="size-3.5" /> Confirm with your password
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {pending === "save"
              ? "Saving re-verifies your password. Five attempts per 15 minutes."
              : pending === "rotate"
                ? "Rotating re-encrypts the stored secret and the Drive token with a new key."
                : "Clearing removes the saved values and the encryption key. Disconnect Drive first."}
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <Label htmlFor="drive-password" className="sr-only">
                Your password
              </Label>
              <Input
                id="drive-password"
                type="password"
                autoComplete="current-password"
                className="h-9"
                value={password}
                autoFocus
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void confirm();
                }}
              />
            </div>
            <Button size="sm" className="h-9" disabled={busy || password.length === 0} onClick={() => void confirm()}>
              {busy ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Check className="mr-1.5 size-3.5" />}
              Confirm
            </Button>
            <Button size="sm" variant="ghost" className="h-9" disabled={busy} onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
          {error && <p className="mt-1.5 text-[11px] font-medium text-rose-700">{error}</p>}
        </div>
      )}

      {testResult && !pending && (
        <p
          className={cn(
            "mt-3 flex items-center gap-1.5 rounded-lg border p-2 text-xs",
            testResult.ok
              ? "border-emerald-300/70 bg-emerald-50 text-emerald-900"
              : "border-amber-300/70 bg-amber-50 text-amber-900",
          )}
        >
          {testResult.ok ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
          {testResult.message}
        </p>
      )}

      {/* ---- Save bar ---- */}
      <div className="sticky bottom-20 z-30 mt-3 md:bottom-4">
        {(dirty.length > 0 || busy) && (
          <div className="glass-strong flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 p-2.5 shadow-lg">
            <span className="flex size-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">
              {dirty.length || 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {dirty.length ? dirty.join(" · ") : "Applying…"}
            </span>
            <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={resetDraft}>
              <Undo2 className="mr-1 size-3.5" /> Discard
            </Button>
            <Button size="sm" className="h-8" disabled={busy || dirty.length === 0} onClick={() => start("save")}>
              {busy ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Save className="mr-1 size-3.5" />}
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-rose-700 hover:bg-rose-50"
          disabled={connected}
          data-tip={connected ? "Disconnect Google Drive first" : undefined}
          onClick={() => start("clear")}
        >
          <Trash2 className="mr-1 size-3.5" /> Clear credentials
        </Button>
        {anyManagedByEnv && (
          <span className="text-[11px] text-muted-foreground">
            Values from the server environment are used only as a fallback — anything saved here takes precedence.
          </span>
        )}
      </div>
    </section>
  );
}
