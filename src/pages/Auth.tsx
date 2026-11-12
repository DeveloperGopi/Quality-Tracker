import { useConvex } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { NqasLogo } from "@/components/NqasLogo";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { ReactNode } from "react";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function AuthFrame({
  onLogoClick,
  children,
}: {
  onLogoClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center justify-center h-full flex-col">
          <Card className="min-w-[350px] border shadow-md">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <button
                  type="button"
                  aria-label="NQAS Tracker home"
                  className="mb-4 mt-4 cursor-pointer rounded-lg"
                  onClick={onLogoClick}
                >
                  <NqasLogo className="size-16" />
                </button>
              </div>
            </CardHeader>
            {children}
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Map low-level Convex Auth errors to actionable messages. */
function friendlyAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("InvalidAccountId") ||
    msg.includes("NO_PASSWORD_ACCOUNT") ||
    msg.includes("reading '_id'")
  ) {
    return "No password account exists for this email yet. Use Register with the same email to set a password — accounts created before the password switch must register once (your role is restored automatically for designated admins).";
  }
  if (msg.includes("InvalidSecret")) return "Incorrect password. Try again or use Forgot password.";
  if (msg.includes("already exists")) {
    return "This email is already registered. Sign in instead, or use Forgot password if you don't remember your password.";
  }
  if (msg.includes("TooManyFailedAttempts")) {
    return "Too many failed attempts. Wait a moment and try again.";
  }
  return err instanceof Error ? err.message : "Authentication failed";
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const convex = useConvex();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [mode, setMode] = useState<"signIn" | "signUp" | "reset">("signIn");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const flow = mode === "signUp" ? "signUp" : "signIn";
    try {
      await signIn("password", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        ...(mode === "signUp"
          ? { name: String(formData.get("name") ?? ""), flow }
          : { flow }),
      });
      // Registration signs the user in; the protected-route gate shows either
      // the activation button (first user / designated admin) or the
      // pending-approval notice for everyone else.
      navigate(redirect);
    } catch (err) {
      setError(friendlyAuthError(err));
      setIsLoading(false);
    }
  };

  const handleResetRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    try {
      // Pre-check BEFORE calling the built-in "reset" flow: Convex Auth's
      // Password provider crashes with a raw TypeError (account._id of null)
      // when the email has no password credential. Direct such accounts to
      // the Register flow instead, which attaches a password to the
      // existing user without creating a duplicate.
      const account = await convex.query(api.users.hasPasswordAccount, {
        email,
      });
      if (account === null) {
        setError(
          "No account exists for this email. Use Register to create one.",
        );
        setIsLoading(false);
        return;
      }
      if (!account.hasPassword) {
        setError(
          "This account has no password set (it was created under the earlier email-code sign-in). Use Register with the same email once to set a password — your role and data are kept.",
        );
        setIsLoading(false);
        return;
      }
      await signIn("password", { email, flow: "reset" });
      setResetEmail(email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("InvalidAccountId") || msg.includes("reading '_id'")
          ? "This account has no password set. Use Register with the same email once to set a password — your role and data are kept."
          : friendlyAuthError(err),
      );
    }
    setIsLoading(false);
  };

  const handleResetVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    try {
      await signIn("password", {
        email: resetEmail,
        flow: "reset-verification",
        code: resetCode,
        newPassword: String(formData.get("newPassword") ?? ""),
      });
      navigate(redirect);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("InvalidSecret")
          ? "Invalid or expired code"
          : friendlyAuthError(err),
      );
      setResetCode("");
    }
    setIsLoading(false);
  };

  const backToSignIn = () => {
    setMode("signIn");
    setResetEmail("");
    setResetCode("");
    setError(null);
  };

  // ----- Forgot password: request code -----
  if (mode === "reset" && !resetEmail) {
    return (
      <AuthFrame onLogoClick={() => navigate("/")}>
        <CardTitle className="text-xl text-center">Reset password</CardTitle>
        <CardDescription className="text-center mt-1">
          We'll email you a 6-digit reset code
        </CardDescription>
        <form onSubmit={handleResetRequest}>
          <CardContent className="space-y-3 mt-2">
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="email"
                placeholder="abc@gmail.com"
                type="email"
                className="pl-9"
                disabled={isLoading}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
          <CardFooter className="flex-col gap-2 pb-6">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reset code
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={backToSignIn}
            >
              Back to sign in
            </Button>
          </CardFooter>
        </form>
      </AuthFrame>
    );
  }

  // ----- Forgot password: enter code + new password -----
  if (mode === "reset" && resetEmail) {
    return (
      <AuthFrame onLogoClick={() => navigate("/")}>
        <CardTitle className="text-xl text-center">Reset password</CardTitle>
        <CardDescription className="text-center mt-1">
          Code sent to {resetEmail}
        </CardDescription>
        <form onSubmit={handleResetVerify}>
          <CardContent className="space-y-4 mt-2">
            <div className="flex justify-center">
              <InputOTP
                value={resetCode}
                onChange={setResetCode}
                maxLength={6}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <InputOTPSlot key={idx} index={idx} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="At least 8 characters"
                  className="pl-9"
                  disabled={isLoading}
                  required
                  minLength={8}
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 pb-6">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || resetCode.length !== 6}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set new password
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={backToSignIn}
            >
              Back to sign in
            </Button>
          </CardFooter>
        </form>
      </AuthFrame>
    );
  }

  // ----- Sign in / Register -----
  return (
    <AuthFrame onLogoClick={() => navigate("/")}>
      <CardTitle className="text-xl text-center">
        {mode === "signIn" ? "Sign in" : "Register"}
      </CardTitle>
      <CardDescription className="text-center mt-1">
        {mode === "signIn"
          ? "Sign in with your email and password"
          : "Create an account — a State Admin must approve new registrations"}
      </CardDescription>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3 mt-2">
          {mode === "signUp" && (
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="name"
                placeholder="Full name"
                className="pl-9"
                disabled={isLoading}
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="email"
              placeholder="abc@gmail.com"
              type="email"
              className="pl-9"
              disabled={isLoading}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="password"
              type="password"
              placeholder={
                mode === "signUp" ? "Password (min 8 characters)" : "Password"
              }
              className="pl-9"
              disabled={isLoading}
              required
              minLength={8}
            />
          </div>            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        <CardFooter className="flex-col gap-2 pb-6">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "signIn" ? "Sign in" : "Register"}
          </Button>
          {mode === "signUp" && error && error.includes("already registered") && (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() => {
                setMode("signIn");
                setError(null);
              }}
            >
              Go to sign in
            </Button>
          )}
          {mode === "signIn" && (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() => {
                setMode("reset");
                setError(null);
              }}
            >
              Forgot password?
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            {mode === "signIn" ? (
              <>
                Need an account?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => {
                    setMode("signUp");
                    setError(null);
                  }}
                >
                  Register
                </Button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => {
                    setMode("signIn");
                    setError(null);
                  }}
                >
                  Sign in
                </Button>
              </>
            )}
          </p>
        </CardFooter>
      </form>
    </AuthFrame>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
