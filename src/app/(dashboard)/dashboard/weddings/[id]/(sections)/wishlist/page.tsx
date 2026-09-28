import { WishlistManager } from "@/components/dashboard/wishlist-manager";
import { requireUser } from "@/lib/auth/session";
import { listGiftItems } from "@/lib/data/wishlist";
import { toGiftItemDto } from "@/lib/wedding-content-dto";
import { requireOwnedWedding } from "@/lib/wedding-access";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage({ params }: PageProps<"/dashboard/weddings/[id]/wishlist">) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/weddings/${id}/wishlist`);
  await requireOwnedWedding(id, user.id);

  const items = await listGiftItems(id);

  return (
    <div className="grid gap-6">
      <WishlistManager weddingId={id} items={items.map(toGiftItemDto)} />
    </div>
  );
}
