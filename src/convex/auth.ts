import { convexAuth } from "@convex-dev/auth/server";
import { HardenedPassword } from "./auth/passwordProvider";

// Email + password sign-in for the NQAS & Kayakalp tracker.
// New registrations are created without an appRole and must be approved by a
// State Admin (Admin Settings → Pending registrations) before they can access
// the app. The designated super-admin email(s) in src/convex/lifecycle.ts
// bootstrap the first admin by self-activating.
//
// HardenedPassword wraps the stock Password provider so the `reset` and
// `email-verification` flows fail with a clear message instead of crashing
// with `TypeError: reading '_id'` when an email has no password credential
// (accounts created under the old OTP sign-in). See passwordProvider.ts.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [HardenedPassword()],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const profile = args.profile as {
        email?: string;
        name?: string;
        emailVerified?: boolean;
        phoneVerified?: boolean;
      };
      const email =
        typeof profile.email === "string" ? profile.email : undefined;
      const name =
        typeof profile.name === "string" && profile.name.trim()
          ? profile.name.trim()
          : undefined;
      // The email-based reset flow verifies the email address.
      const emailVerified =
        profile.emailVerified === true || args.type === "email";

      const userData = {
        ...(email !== undefined ? { email } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(emailVerified ? { emailVerificationTime: Date.now() } : {}),
      };

      if (args.existingUserId !== null) {
        const existing = await ctx.db.get(args.existingUserId);
        if (existing !== null) {
          // Normal path: patch profile fields on the existing user doc.
          await ctx.db.patch(args.existingUserId, userData);
          return args.existingUserId;
        }
        // Orphaned credential: the users document was deleted but its
        // authAccounts row survived. Re-create the user document so the
        // credential points at a real user again. appRole starts empty —
        // the normal first-user / super-admin / approval logic applies.
        const newId = await ctx.db.insert("users", userData);
        return newId;
      }

      // No credential row yet. If a user with this email already exists
      // (OTP-era account), attach this new credential to that user instead
      // of creating a duplicate account.
      if (email !== undefined) {
        const byEmail = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), email))
          .first();
        if (byEmail !== null) {
          await ctx.db.patch(byEmail._id, userData);
          return byEmail._id;
        }
      }

      // Truly new user: create a fresh document (no appRole until approved).
      return await ctx.db.insert("users", userData);
    },
  },
});
