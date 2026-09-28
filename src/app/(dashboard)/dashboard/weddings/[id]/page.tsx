import { CalendarHeart, Contact, Gift, Images, Pencil } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { listContacts } from "@/lib/data/contacts";
import { listEvents } from "@/lib/data/wedding-events";
import { listGalleryImages } from "@/lib/data/gallery";
import { listGiftItems } from "@/lib/data/wishlist";
import { requireOwnedWedding } from "@/lib/wedding-access";

export const metadata = { title: "Wedding" };

/**
 * Entry point for one wedding: the four content sections plus a link to the
 * wedding's own details form.
 *
 * The counts are shown so the hub is worth visiting rather than just a menu —
 * but they come from the same wedding-scoped queries as the sections, so they
 * cannot reveal another wedding's contents.
 */
export default async function WeddingHubPage({ params }: PageProps<"/dashboard/weddings/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/weddings/${id}`);
  const wedding = await requireOwnedWedding(id, user.id);

  const [events, contacts, images, gifts] = await Promise.all([
    listEvents(id),
    listContacts(id),
    listGalleryImages(id),
    listGiftItems(id),
  ]);

  const sections = [
    { segment: "events", label: "Events", icon: CalendarHeart, count: events.length },
    { segment: "contacts", label: "Contacts", icon: Contact, count: contacts.length },
    { segment: "gallery", label: "Gallery", icon: Images, count: images.length },
    { segment: "wishlist", label: "Wishlist", icon: Gift, count: gifts.length },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <header className="grid gap-2">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground w-fit text-sm">
          &larr; All weddings
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{wedding.title}</h1>
          <Badge variant="secondary">{wedding.status}</Badge>
        </div>
        {wedding.weddingDateShort ? (
          <p className="text-muted-foreground text-sm">{wedding.weddingDateShort}</p>
        ) : null}
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/weddings/${id}/edit`}>
              <Pencil aria-hidden className="size-4" />
              Edit wedding details
            </Link>
          </Button>
        </div>
      </header>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {sections.map(({ segment, label, icon: Icon, count }) => (
          <li key={segment}>
            <Link
              href={`/dashboard/weddings/${id}/${segment}`}
              className="border-border hover:bg-muted flex items-center gap-3 rounded-lg border p-4"
            >
              <Icon aria-hidden className="size-5" />
              <span className="flex-1 font-medium">{label}</span>
              <span className="text-muted-foreground text-sm">
                {count} {count === 1 ? "item" : "items"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
