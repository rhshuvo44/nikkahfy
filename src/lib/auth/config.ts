import "server-only";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";

import { getRawDb } from "@/lib/mongodb";
import { DEFAULT_USER_ROLE } from "@/lib/roles";

export { USER_ROLES, type UserRole } from "@/lib/roles";

/**
 * Server-side Better Auth instance.
 *
 * Persistence is handled by the MongoDB adapter, which owns the `user`,
 * `session`, `account` and `verification` collections. Mongoose models must point
 * at those same collections (see `src/lib/models/*`) rather than duplicating them.
 *
 * `nextCookies()` MUST stay the last plugin in the list so that session cookies
 * set from Server Actions are written to the outgoing response.
 */
export const auth = betterAuth({
  appName: "Nikkahfy",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(getRawDb()),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      // `input: false` keeps these server-managed: a client can never set its own
      // role or disable itself through the sign-up / update endpoints.
      role: {
        type: "string",
        required: false,
        defaultValue: DEFAULT_USER_ROLE,
        input: false,
      },
      disabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    cookiePrefix: "nikkahfy",
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
