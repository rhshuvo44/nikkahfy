import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth, type AuthSession, type UserRole } from "@/lib/auth/config";

/**
 * Every helper in this module performs a real, server-side session lookup.
 * Client state and `proxy.ts` are only optimisations — never the source of truth.
 */

/** Reads the current session, or `null` when the visitor is anonymous. */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  return auth.api.getSession({ headers: await headers() });
});

export type CurrentUser = AuthSession["user"] & {
  role: UserRole;
  disabled: boolean;
};

function toCurrentUser(user: AuthSession["user"]): CurrentUser {
  return {
    ...user,
    role: user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER",
    disabled: Boolean(user.disabled),
  };
}

/** Returns the signed-in user, or `null`. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session?.user) return null;

  const user = toCurrentUser(session.user);

  // A disabled account keeps its session until it expires; refuse access now.
  if (user.disabled) return null;

  return user;
}

/** Requires any signed-in user. Redirects to login otherwise. */
export async function requireUser(callbackUrl?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login");
  }

  return user;
}

/** Requires a SUPER_ADMIN. Regular users are redirected to their dashboard. */
export async function requireSuperAdmin(callbackUrl?: string): Promise<CurrentUser> {
  const user = await requireUser(callbackUrl);

  if (user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return user;
}

export function isSuperAdmin(user: { role: UserRole } | null | undefined): boolean {
  return user?.role === "SUPER_ADMIN";
}
