import { useMutation, useQuery } from "convex/react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const location = useLocation();

  const signedIn = !isLoading && isAuthenticated && user !== null;

  // Only query activation state once signed in — the query itself requires an
  // authenticated user.
  const activation = useQuery(
    api.facilities.getActivationState,
    signedIn ? {} : "skip",
  );

  if (isLoading || user === undefined || (signedIn && activation === undefined)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated || user === null) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  // Disabled accounts: every API would refuse, so show the reason instead of
  // a wall of failed queries. Re-enabling restores access without data loss.
  if (activation?.disabled) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="glass w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="size-5 text-primary" /> Account disabled
            </CardTitle>
            <CardDescription>
              This account was disabled by a State Admin. Sign-in and every
              request are blocked until it is enabled again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full" onClick={() => void signOut()}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Signed in but not yet approved: show the activation/approval gate instead
  // of the page (so no protected queries run against the backend).
  if (!user.appRole) {
    return (
      <ActivationGate
        name={user.name ?? null}
        email={user.email ?? null}
        canSelfActivate={activation?.canSelfActivate ?? false}
        onSignOut={() => void signOut()}
      />
    );
  }

  return children;
}

function ActivationGate({
  name,
  email,
  canSelfActivate,
  onSignOut,
}: {
  name: string | null;
  email: string | null;
  canSelfActivate: boolean;
  onSignOut: () => void;
}) {
  const claimAccess = useMutation(api.facilities.claimAccess);
  const [busy, setBusy] = useState(false);

  const activate = async () => {
    setBusy(true);
    try {
      const res = await claimAccess({ name: name || email || "User" });
      toast.success(
        res.appRole === "admin"
          ? "Account activated — you are the State Admin"
          : "Account activated",
      );
      // Reactive user query updates -> gate unmounts, page loads.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="glass w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="size-5 text-primary" />
            {canSelfActivate ? "Activate your account" : "Awaiting approval"}
          </CardTitle>
          <CardDescription>
            {canSelfActivate
              ? "One-time setup for the NQAS & Kayakalp tracker"
              : "Your registration is pending review by a State Admin"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            You are signed in as{" "}
            <strong>{name || email || "a new user"}</strong>
            {canSelfActivate
              ? ". Click below to activate your account for the tracker. The first person to activate becomes the State Admin; designated admin emails always activate as State Admin."
              : ". Until an admin approves your registration, you cannot access the tracker. Please contact your State Admin to approve your account."}
          </p>
          {canSelfActivate ? (
            <Button className="w-full" disabled={busy} onClick={activate}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Activate my account
            </Button>
          ) : (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              Registration pending — ask your State Admin to approve this
              account from Admin Settings → Pending registrations.
            </div>
          )}
          <Button variant="ghost" className="w-full" onClick={onSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
