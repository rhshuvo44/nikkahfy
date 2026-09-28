import { CalendarHeart, Contact, Gift, Images } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { requireUser } from "@/lib/auth/session";
import { requireOwnedWedding } from "@/lib/wedding-access";

/**
 * Shell for every content section of one wedding.
 *
 * This lives in a `(sections)` route group so the header and nav wrap only the four
 * content pages, leaving `/edit` with its own back-link and page title.
 *
 * The ownership check happens here, once, for the whole subtree: `requireUser`
 * then `requireOwnedWedding`. A wedding owned by somebody else never renders a
 * layout, so no section below can leak a title, a count, or a form.
 *
 * Resolving the wedding here also means each section page gets the title and id
 * for free and cannot forget the check.
 */

const SECTIONS = [
  { segment: "events", label: "Events", icon: CalendarHeart },
  { segment: "contacts", label: "Contacts", icon: Contact },
  { segment: "gallery", label: "Gallery", icon: Images },
  { segment: "wishlist", label: "Wishlist", icon: Gift },
] as const;

export default async function WeddingContentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/weddings/${id}`);
  const wedding = await requireOwnedWedding(id, user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <header className="grid gap-1">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground w-fit text-sm"
        >
          &larr; All weddings
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{wedding.title}</h1>
        {wedding.weddingDateShort ? (
          <p className="text-muted-foreground text-sm">{wedding.weddingDateShort}</p>
        ) : null}
      </header>

      <nav aria-label="Wedding sections" className="flex flex-wrap gap-2">
        {SECTIONS.map(({ segment, label, icon: Icon }) => (
          <Link
            key={segment}
            href={`/dashboard/weddings/${id}/${segment}`}
            className="border-border hover:bg-muted inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium"
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      {children}
    </main>
  );
}
