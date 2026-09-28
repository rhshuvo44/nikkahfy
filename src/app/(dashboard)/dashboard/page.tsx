import Link from "next/link";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(dashboard)/actions";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="grid gap-2">
        <h1 className="font-serif text-3xl font-medium">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Your weddings will appear here. This shell is built out in Session 2.
        </p>
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
      <Link href="/" className="text-muted-foreground text-sm underline underline-offset-4">
        Back to home
      </Link>
    </main>
  );
}
