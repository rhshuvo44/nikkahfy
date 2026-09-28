/**
 * Roles are declared in their own module so that `src/lib/models/*` can use them
 * without importing `@/lib/auth/config` — which would instantiate the whole
 * Better Auth server (and pull in `server-only`) just to read a constant.
 *
 * Kept in lockstep with `user.additionalFields` in `@/lib/auth/config`.
 */
export const USER_ROLES = ["USER", "SUPER_ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const DEFAULT_USER_ROLE: UserRole = "USER";
