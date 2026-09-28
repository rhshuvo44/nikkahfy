import { GalleryManager } from "@/components/dashboard/gallery-manager";
import { requireUser } from "@/lib/auth/session";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { listGalleryImages } from "@/lib/data/gallery";
import { toGalleryImageDto } from "@/lib/wedding-content-dto";
import { requireOwnedWedding } from "@/lib/wedding-access";

export const metadata = { title: "Gallery" };

export default async function GalleryPage({ params }: PageProps<"/dashboard/weddings/[id]/gallery">) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/weddings/${id}/gallery`);
  await requireOwnedWedding(id, user.id);

  const images = await listGalleryImages(id);

  return (
    <div className="grid gap-6">
      <GalleryManager
        weddingId={id}
        images={images.map(toGalleryImageDto)}
        // Probed on the server so the browser is not asked to read a secret, and
        // so the page can explain the missing keys instead of failing on submit.
        cloudinaryConfigured={isCloudinaryConfigured()}
      />
    </div>
  );
}
