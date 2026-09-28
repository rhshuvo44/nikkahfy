"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Pencil } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  createGiftItemAction,
  deleteGiftItemAction,
  moveGiftItemAction,
  updateGiftItemAction,
  type WishlistActionState,
} from "@/app/(dashboard)/dashboard/weddings/[id]/(sections)/wishlist/actions";
import {
  DeleteButton,
  EmptyList,
  MoveButtons,
  RowCard,
  useAction,
} from "@/components/dashboard/content-list";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { giftItemSchema, type GiftItemValues } from "@/lib/validation/wedding-children";
import type { GiftItemDto } from "@/lib/wedding-content-dto";

/**
 * Wishlist. The image is optional, so the whole section works without
 * Cloudinary — only the file field needs it.
 */

const EMPTY: GiftItemValues = { title: "", description: "", link: "" };

export function WishlistManager({
  weddingId,
  items,
}: {
  weddingId: string;
  items: GiftItemDto[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="grid gap-6">
      <GiftForm
        key="new"
        weddingId={weddingId}
        action={createGiftItemAction.bind(null, weddingId)}
        submitLabel="Add gift"
        heading="Add a gift"
        defaults={EMPTY}
      />

      {items.length === 0 ? (
        <EmptyList>No gifts listed yet. That is fine — the wishlist can stay empty.</EmptyList>
      ) : (
        <ul className="grid gap-3">
          {items.map((item, index) => (
            <RowCard key={item.id} className="flex-row items-start justify-between">
              {editingId === item.id ? (
                <GiftForm
                  key={item.id}
                  weddingId={weddingId}
                  action={updateGiftItemAction.bind(null, weddingId, item.id)}
                  submitLabel="Save"
                  heading=""
                  defaults={{
                    title: item.title,
                    description: item.description,
                    link: item.link,
                  }}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    {item.imageUrl ? (
                      <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-md">
                        <Image
                          src={item.imageUrl}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="grid gap-0.5">
                      <p className="font-medium">{item.title}</p>
                      {item.description ? (
                        <p className="text-muted-foreground text-sm">{item.description}</p>
                      ) : null}
                      {item.link ? (
                        <p className="text-muted-foreground text-sm break-words">{item.link}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(item.id)}
                    >
                      <Pencil aria-hidden className="size-4" />
                      Edit
                    </Button>
                    <MoveGiftButtons
                      weddingId={weddingId}
                      itemId={item.id}
                      isFirst={index === 0}
                      isLast={index === items.length - 1}
                    />
                    <DeleteGiftButton weddingId={weddingId} itemId={item.id} />
                  </div>
                </>
              )}
            </RowCard>
          ))}
        </ul>
      )}
    </div>
  );
}

function GiftForm({
  action,
  submitLabel,
  heading,
  defaults,
  onDone,
}: {
  weddingId: string;
  action: (state: WishlistActionState, formData: FormData) => Promise<WishlistActionState>;
  submitLabel: string;
  heading: string;
  defaults: GiftItemValues;
  onDone?: () => void;
}) {
  const [state, formAction, isActionPending] = useActionState<WishlistActionState, FormData>(
    action,
    { status: "idle" },
  );
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<GiftItemValues>({
    resolver: zodResolver(giftItemSchema),
    defaultValues: defaults,
  });

  const isPending = isActionPending || form.formState.isSubmitting;
  const errors = form.formState.errors;

  useEffect(() => {
    if (state.status !== "error" || !state.errors) return;
    for (const [name, message] of Object.entries(state.errors)) {
      form.setError(name as keyof GiftItemValues, { type: "server", message });
    }
  }, [state, form]);

  useEffect(() => {
    if (state.status === "success") {
      form.reset();
      if (fileRef.current) fileRef.current.value = "";
      onDone?.();
    }
  }, [state, onDone, form]);

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit((values, event) => {
        // `new FormData(formElement)` picks the optional file up from the file
        // input, which avoids reading a ref inside a render-time callback.
        const formElement = event?.target as HTMLFormElement | undefined;
        if (!formElement) return;

        const formData = new FormData(formElement);
        // Overwrite with the resolver's trimmed values rather than trusting the
        // raw strings.
        formData.set("title", values.title);
        formData.set("description", values.description);
        formData.set("link", values.link);

        startTransition(async () => {
          await formAction(formData);
        });
      })}
    >
      {heading ? <h2 className="text-sm font-semibold">{heading}</h2> : null}

      <div className="grid gap-4">
        <Field
          label="Title"
          name="title"
          error={errors.title?.message}
          fieldProps={form.register("title")}
        />

        <Field label="Description" name="description" error={errors.description?.message}>
          <Textarea
            id="description"
            rows={2}
            aria-invalid={errors.description ? true : undefined}
            {...form.register("description")}
          />
        </Field>

        <Field
          label="Link or payment details"
          name="link"
          placeholder="https://store.example/item  ·  or  bKash: 01700-000000"
          hint="A store link, or bank / e-wallet details to send a gift to."
          error={errors.link?.message}
          fieldProps={form.register("link")}
        />

        <div className="grid gap-2">
          <label htmlFor="gift-image" className="text-sm font-medium">
            Image (optional)
          </label>
          <input
            ref={fileRef}
            id="gift-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="border-border text-muted-foreground file:bg-muted file:text-foreground file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm w-full rounded-md border p-2 text-sm"
          />
          <p className="text-muted-foreground text-sm">
            Leave empty to keep the current image. Needs Cloudinary to be configured.
          </p>
        </div>
      </div>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-destructive text-sm">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Check aria-hidden className="size-4" />
          )}
          {submitLabel}
        </Button>
        {onDone ? (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function MoveGiftButtons({
  weddingId,
  itemId,
  isFirst,
  isLast,
}: {
  weddingId: string;
  itemId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { isPending, run } = useAction();

  return (
    <MoveButtons
      isFirst={isFirst}
      isLast={isLast}
      disabled={isPending}
      onMove={(direction) => run(() => moveGiftItemAction(weddingId, itemId, direction))}
    />
  );
}

function DeleteGiftButton({ weddingId, itemId }: { weddingId: string; itemId: string }) {
  const { isPending, run } = useAction();

  return (
    <DeleteButton
      disabled={isPending}
      label="Delete gift"
      onDelete={() => run(() => deleteGiftItemAction(weddingId, itemId), { success: "Gift removed." })}
    />
  );
}
