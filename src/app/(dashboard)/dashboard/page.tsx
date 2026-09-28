import { Plus } from "lucide-react";

import { EmptyWeddings, WeddingCards } from "@/components/dashboard/wedding-cards";
import { Button } from "@/components/ui/button";
import { createWeddingAction } from "@/app/(dashboard)/dashboard/weddings/new/actions";
import { signOutAction } from "@/app/(dashboard)/actions";
import { requireUser } from "@/lib/auth/session";
import { listWeddingsForUser } from "@/lib/data/weddings";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // The layout already calls requireUser(); doing it here too is deliberate —
  // this page reads the user's weddings and must never render on a page that
  // could ever be reached without a verified session.
  const user = await requireUser("/dashboard");
  const weddings = await listWeddingsForUser(user.id);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="font-serif text-3xl font-medium">Your weddings</h1>
          <p className="text-muted-foreground text-sm">
            {weddings.length === 0
              ? "Nothing here yet."
              : `${weddings.length} invitation${weddings.length === 1 ? "" : "s"}.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {weddings.length > 0 ? (
            <form action={createWeddingAction}>
              <Button type="submit">
                <Plus aria-hidden />
                Create Wedding
              </Button>
            </form>
          ) : null}
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {weddings.length === 0 ? (
        <EmptyWeddings onCreate={createWeddingAction} />
      ) : (
        <WeddingCards weddings={weddings} />
      )}
    </main>
  );
}
