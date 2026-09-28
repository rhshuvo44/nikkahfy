import { requireUser } from "@/lib/auth/session";

/**
 * Real, server-side authorization for every `/dashboard/*` route.
 * `proxy.ts` only short-circuits anonymous visitors; this is the actual gate.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  await requireUser("/dashboard");

  return <div className="flex min-h-full flex-col">{children}</div>;
}
