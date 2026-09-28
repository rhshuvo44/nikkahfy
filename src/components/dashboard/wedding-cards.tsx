import { CalendarHeart, MapPin, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Wedding, WeddingStatus } from "@/lib/models/wedding";

const STATUS_LABEL: Record<WeddingStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const STATUS_VARIANT = {
  draft: "secondary",
  published: "default",
  archived: "outline",
} as const;

export function WeddingCards({ weddings }: { weddings: Wedding[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {weddings.map((wedding) => (
        <li key={wedding._id.toString()}>
          <WeddingCard wedding={wedding} />
        </li>
      ))}
    </ul>
  );
}

function WeddingCard({ wedding }: { wedding: Wedding }) {
  const id = wedding._id.toString();
  const couple = [wedding.groomName, wedding.brideName].filter(Boolean).join(" & ");

  return (
    <article className="bg-card text-card-foreground flex h-full flex-col gap-3 rounded-xl border p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-lg leading-tight font-medium">{wedding.title}</h3>
        <Badge variant={STATUS_VARIANT[wedding.status]}>{STATUS_LABEL[wedding.status]}</Badge>
      </div>

      <dl className="text-muted-foreground grid gap-2 text-sm">
        <div className="flex items-center gap-2">
          <CalendarHeart className="size-4 shrink-0" aria-hidden />
          <dd>
            {wedding.weddingDateShort || (
              <span className="italic">No date set yet</span>
            )}
          </dd>
        </div>
        {couple ? (
          <div className="flex items-center gap-2">
            <span aria-hidden className="size-4 shrink-0" />
            <dd>{couple}</dd>
          </div>
        ) : null}
        {wedding.venueName ? (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <dd className="truncate">{wedding.venueName}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-auto pt-2">
        <Button asChild variant="outline" size="sm" className="w-full">
          <a href={`/dashboard/weddings/${id}/edit`}>Edit invitation</a>
        </Button>
      </div>
    </article>
  );
}

export function EmptyWeddings({ onCreate }: { onCreate: () => Promise<void> }) {
  return (
    <div className="border-primary/20 bg-card/60 flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-14 text-center">
      <CalendarHeart className="text-primary/60 size-10" aria-hidden />
      <div className="grid gap-1">
        <p className="font-serif text-lg font-medium">No wedding invitation yet.</p>
        <p className="text-muted-foreground text-sm">
          Create your first invitation and it will show up here.
        </p>
      </div>
      <form action={onCreate}>
        <Button type="submit">
          <Plus aria-hidden />
          Create Wedding
        </Button>
      </form>
    </div>
  );
}
