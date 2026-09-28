import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { WeddingForm } from "@/components/dashboard/wedding-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { findWeddingForUser } from "@/lib/data/weddings";
import { toDateInputValue, type WeddingFormValues } from "@/lib/validation/wedding";

export const metadata = { title: "Edit wedding" };

/**
 * The `id` in the URL is never trusted on its own: `findWeddingForUser` matches
 * it against the session user in the same query, so someone else's wedding
 * yields null and the visitor gets a 404 rather than a readable form.
 */
export default async function EditWeddingPage({ params }: PageProps<"/dashboard/weddings/[id]/edit">) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/weddings/${id}/edit`);

  const wedding = await findWeddingForUser(id, user.id);
  if (!wedding) notFound();

  const values: WeddingFormValues = {
    title: wedding.title,
    groomName: wedding.groomName,
    groomFullName: wedding.groomFullName,
    brideName: wedding.brideName,
    brideFullName: wedding.brideFullName,
    weddingDate: toDateInputValue(wedding.weddingDate),
    weddingTime: wedding.weddingTime,
    dressCode: wedding.dressCode,
    venueName: wedding.venueName,
    venueAddress: wedding.venueAddress,
    mapUrl: wedding.mapUrl,
    wazeUrl: wedding.wazeUrl,
    phone: wedding.phone,
    musicType: wedding.musicType,
    musicUrl: wedding.musicUrl,
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-8 grid gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link href="/dashboard">
            <ArrowLeft aria-hidden />
            All weddings
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl font-medium">{wedding.title}</h1>
          <Badge variant="secondary">{wedding.status}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Changes are saved when you press <span className="font-medium">Save changes</span>.
        </p>
      </div>

      <WeddingForm weddingId={id} defaultValues={values} />
    </main>
  );
}
