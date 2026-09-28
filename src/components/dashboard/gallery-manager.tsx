"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  deleteGalleryImageAction,
  moveGalleryImageAction,
  setBlackAndWhitePairAction,
  updateGalleryAltAction,
  uploadGalleryImageAction,
} from "@/app/(dashboard)/dashboard/weddings/[id]/(sections)/gallery/actions";
import {
  DeleteButton,
  EmptyList,
  MoveButtons,
  RowCard,
  useAction,
} from "@/components/dashboard/content-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { galleryImageSchema } from "@/lib/validation/wedding-children";
import type { GalleryImageValues } from "@/lib/validation/wedding-children";
import type { GalleryImageDto } from "@/lib/wedding-content-dto";

/**
 * Gallery: upload, preview, reorder, delete, and the two-image black-and-white
 * first-row pair.
 *
 * The pair is a checkbox per tile, and once two are selected the remaining
 * checkboxes are disabled. That mirrors `setBlackAndWhitePair` in the data
 * layer — which is what actually enforces the cap, since a disabled input is
 * not something a direct POST can be forced through.
 */

export function GalleryManager({
  weddingId,
  images,
  cloudinaryConfigured,
}: {
  weddingId: string;
  images: GalleryImageDto[];
  cloudinaryConfigured: boolean;
}) {
  const pairCount = images.filter((image) => image.isBlackAndWhitePair).length;

  return (
    <div className="grid gap-6">
      <GalleryUpload weddingId={weddingId} disabled={!cloudinaryConfigured} />

      {images.length === 0 ? (
        <EmptyList>No images yet.</EmptyList>
      ) : (
        <section className="grid gap-3">
          <p className="text-muted-foreground text-sm">
            {pairCount} of 2 black-and-white first-row images selected.
          </p>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image, index) => (
              <GalleryTile
                key={image.id}
                weddingId={weddingId}
                image={image}
                isFirst={index === 0}
                isLast={index === images.length - 1}
                pairFull={pairCount >= 2 && !image.isBlackAndWhitePair}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function GalleryUpload({ weddingId, disabled }: { weddingId: string; disabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<GalleryImageValues>({
    resolver: zodResolver(galleryImageSchema),
    defaultValues: { alt: "" },
  });

  const errors = form.formState.errors;

  // Clear the file input after a successful upload: a re-submit would otherwise
  // re-upload the same image, and the browser does not reset the control for you.
  useEffect(() => {
    if (!isPending && form.formState.isSubmitSuccessful) {
      form.reset();
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [isPending, form]);

  if (disabled) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
        Image uploads are not configured. Add the <code>CLOUDINARY_*</code> keys to{" "}
        <code>.env.local</code> to use the gallery.
      </p>
    );
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit((values, event) => {
        // `new FormData(formElement)` picks the file up from the file input,
        // which avoids reading a ref inside a render-time callback.
        const formElement = event?.target as HTMLFormElement | undefined;
        if (!formElement) return;

        // Start from the form so the File rides along, then overwrite the text
        // field with the resolver's trimmed value.
        const formData = new FormData(formElement);
        formData.set("alt", values.alt);

        startTransition(async () => {
          const result = await uploadGalleryImageAction(weddingId, formData);
          if (result.ok) toast.success("Image uploaded.");
          else toast.error(result.message);
        });
      })}
    >
      <h2 className="text-sm font-semibold">Upload an image</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="gallery-file">Image file</Label>
          <input
            ref={fileRef}
            id="gallery-file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="border-border text-muted-foreground file:bg-muted file:text-foreground file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm w-full rounded-md border p-2 text-sm"
          />
          <p className="text-muted-foreground text-sm">JPEG, PNG, WebP or AVIF, up to 10 MB.</p>
        </div>

        <Field
          label="Alt text"
          name="alt"
          hint="Describes the image for anyone using a screen reader."
          error={errors.alt?.message}
          fieldProps={form.register("alt")}
        />
      </div>

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Upload aria-hidden className="size-4" />
          )}
          Upload
        </Button>
      </div>
    </form>
  );
}

function GalleryTile({
  weddingId,
  image,
  isFirst,
  isLast,
  pairFull,
}: {
  weddingId: string;
  image: GalleryImageDto;
  isFirst: boolean;
  isLast: boolean;
  pairFull: boolean;
}) {
  const { isPending, run } = useAction();
  const [alt, setAlt] = useState(image.alt);
  const [editing, setEditing] = useState(false);

  return (
    <RowCard className="gap-3">
      <div className="bg-muted relative aspect-square overflow-hidden rounded-md">
        <Image
          src={image.url}
          alt={image.alt || ""}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover"
        />
        {image.isBlackAndWhitePair ? (
          <Badge className="absolute top-2 left-2">B&W pair</Badge>
        ) : null}
      </div>

      {editing ? (
        <div className="grid gap-2">
          <Field label="Alt text" name={`alt-${image.id}`}>
            <input
              id={`alt-${image.id}`}
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              className="border-input w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(async () => {
                  const result = await updateGalleryAltAction(weddingId, image.id, alt);
                  if (result.ok) setEditing(false);
                  return result;
                })
              }
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAlt(image.alt);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {image.alt || "No alt text"}
        </p>
      )}

      <label
        className={
          pairFull
            ? "text-muted-foreground flex items-center gap-2 text-xs"
            : "flex items-center gap-2 text-xs"
        }
      >
        <input
          type="checkbox"
          checked={image.isBlackAndWhitePair}
          disabled={isPending || pairFull}
          onChange={(event) => {
            const next = event.target.checked;
            run(() => setBlackAndWhitePairAction(weddingId, image.id, next));
          }}
          className="size-4"
        />
        Black-and-white first row
      </label>

      <div className="flex items-center justify-between gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? "Close" : "Edit alt"}
        </Button>
        <div className="flex items-center gap-1">
          <MoveButtons
            isFirst={isFirst}
            isLast={isLast}
            disabled={isPending}
            onMove={(direction) => run(() => moveGalleryImageAction(weddingId, image.id, direction))}
          />
          <DeleteButton
            disabled={isPending}
            label="Delete image"
            onDelete={() =>
              run(() => deleteGalleryImageAction(weddingId, image.id), { success: "Image deleted." })
            }
          />
        </div>
      </div>
    </RowCard>
  );
}
