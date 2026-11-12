import { Password } from "@convex-dev/auth/providers/Password";
import type { Value } from "convex/values";
import { emailOtp } from "./emailOtp";

// Hardened wrapper around Convex Auth's Password provider.
//
// The stock provider has a null-dereference bug in the `reset` /
// `email-verification` flows: `retrieveAccount` returns the *string*
// "InvalidAccountId" when no password credential exists for the email, the
// provider destructures it (`const { account } = "InvalidAccountId"` →
// undefined) and then crashes on `account._id` — surfacing to the user as
// "TypeError: Cannot read properties of null (reading '_id')".
//
// We fix it by wrapping `authorize` in our own guard:
//  - signUp with an email that has no password credential yet → handled
//    normally (the createOrUpdateUser callback links it to the existing user)
//  - reset / email-verification with no password credential → throw a clear
//    error telling the user to Register once with the same email instead of
//    crashing with a raw TypeError.

type AuthorizeArgs = Partial<Record<string, Value | undefined>>;

async function hasPasswordCredential(
  ctx: unknown,
  email: string,
): Promise<boolean> {
  try {
    const runMutation = (
      ctx as { runMutation: (ref: string, args: unknown) => Promise<unknown> }
    ).runMutation;
    const result = (await runMutation("auth:store", {
      type: "retrieveAccountWithCredentials",
      provider: "password",
      account: { id: email }, // no secret → lookup only, no verify, no rate-limit
    })) as unknown;
    return (
      typeof result === "object" &&
      result !== null &&
      "account" in result &&
      (result as { account: unknown }).account != null
    );
  } catch {
    return false;
  }
}

export function HardenedPassword() {
  const provider = Password({
    // "Forgot password" sends a 6-digit code by email (same sender as the
    // old OTP sign-in) so pre-existing accounts can set a password.
    reset: emailOtp,
    profile: (params) => {
      const name = typeof params.name === "string" ? params.name.trim() : "";
      return {
        email: params.email as string,
        ...(name ? { name } : {}),
      };
    },
    validatePasswordRequirements: (password: string) => {
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }
    },
  });

  const stockAuthorize = provider.authorize;
  if (!stockAuthorize) return provider;

  provider.authorize = async (
    params: AuthorizeArgs,
    ctx: Parameters<typeof stockAuthorize>[1],
  ) => {
    const flow = typeof params.flow === "string" ? params.flow : "";
    const email =
      typeof params.email === "string" ? params.email.trim() : "";

    // Guard the crash paths before the stock provider can dereference a
    // missing account.
    if (
      (flow === "reset" || flow === "email-verification") &&
      email
    ) {
      const hasPassword = await hasPasswordCredential(ctx, email);
      if (!hasPassword) {
        throw new Error(
          "NO_PASSWORD_ACCOUNT: This account has no password set (it was created under the earlier email-code sign-in). Use Register with the same email once to set a password — your role and data are kept.",
        );
      }
    }

    return stockAuthorize(params, ctx);
  };

  return provider;
}
