import { EventsManager } from "@/components/dashboard/events-manager";
import { listEvents } from "@/lib/data/wedding-events";
import { requireUser } from "@/lib/auth/session";
import { toEventDto } from "@/lib/wedding-content-dto";
import { requireOwnedWedding } from "@/lib/wedding-access";

export const metadata = { title: "Events" };

/**
 * The layout has already proved ownership of this wedding, so the only work left
 * is reading the list. The guard is repeated anyway: a layout is a place a
 * future refactor could move a check out of, and it costs one indexed query.
 */
export default async function EventsPage({ params }: PageProps<"/dashboard/weddings/[id]/events">) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/weddings/${id}/events`);
  await requireOwnedWedding(id, user.id);

  const events = await listEvents(id);

  return (
    <div className="grid gap-6">
      <EventsManager weddingId={id} events={events.map(toEventDto)} />
    </div>
  );
}
