import Link from "next/link";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createWeddingAction } from "@/app/(dashboard)/dashboard/weddings/new/actions";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "New wedding" };

/**
 * Creating the draft is a POST, triggered by the button, rather than a side
 * effect of rendering this page. A GET that inserted a document would duplicate
 * the draft on refresh and on link prefetch. The action creates the wedding and
 * redirects to its editor.
 */
export default async function NewWeddingPage() {
  await requireUser("/dashboard/weddings/new");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-10">
      <div className="border-primary/20 bg-card/60 grid gap-5 rounded-xl border border-dashed p-8 text-center">
        <CalendarPlus className="text-primary/70 mx-auto size-10" aria-hidden />
        <div className="grid gap-2">
          <h1 className="font-serif text-2xl font-medium">Start a new invitation</h1>
          <p className="text-muted-foreground text-sm">
            We will create a draft wedding for your account and open the editor straight away.
            Nothing is published until you publish it later.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <form action={createWeddingAction}>
            <Button type="submit">
              <CalendarPlus aria-hidden />
              Create draft
            </Button>
          </form>
          <Button asChild variant="ghost">
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
