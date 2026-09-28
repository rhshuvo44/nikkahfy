import { ContactsManager } from "@/components/dashboard/contacts-manager";
import { requireUser } from "@/lib/auth/session";
import { listContacts } from "@/lib/data/contacts";
import { toContactDto } from "@/lib/wedding-content-dto";
import { requireOwnedWedding } from "@/lib/wedding-access";

export const metadata = { title: "Contacts" };

export default async function ContactsPage({ params }: PageProps<"/dashboard/weddings/[id]/contacts">) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/weddings/${id}/contacts`);
  await requireOwnedWedding(id, user.id);

  const contacts = await listContacts(id);

  return (
    <div className="grid gap-6">
      <ContactsManager weddingId={id} contacts={contacts.map(toContactDto)} />
    </div>
  );
}
