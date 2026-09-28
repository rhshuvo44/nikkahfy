"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Pencil } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  createContactAction,
  deleteContactAction,
  moveContactAction,
  updateContactAction,
  type ContactActionState,
} from "@/app/(dashboard)/dashboard/weddings/[id]/(sections)/contacts/actions";
import {
  DeleteButton,
  EmptyList,
  MoveButtons,
  RowCard,
  useAction,
} from "@/components/dashboard/content-list";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { contactSchema, type ContactValues } from "@/lib/validation/wedding-children";
import type { ContactDto } from "@/lib/wedding-content-dto";

/** Contacts: the plain add / edit / delete / reorder list, no nesting. */

const EMPTY: ContactValues = { name: "", role: "", phone: "" };

export function ContactsManager({
  weddingId,
  contacts,
}: {
  weddingId: string;
  contacts: ContactDto[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="grid gap-6">
      <ContactForm
        key="new"
        action={createContactAction.bind(null, weddingId)}
        submitLabel="Add contact"
        heading="Add a contact"
        defaults={EMPTY}
      />

      {contacts.length === 0 ? (
        <EmptyList>No contacts yet.</EmptyList>
      ) : (
        <ul className="grid gap-3">
          {contacts.map((contact, index) => (
            <RowCard key={contact.id} className="flex-row items-center justify-between">
              {editingId === contact.id ? (
                <ContactForm
                  key={contact.id}
                  action={updateContactAction.bind(null, weddingId, contact.id)}
                  submitLabel="Save"
                  heading=""
                  defaults={{ name: contact.name, role: contact.role, phone: contact.phone }}
                  onDone={() => setEditingId(null)}
                  compact
                />
              ) : (
                <>
                  <div className="grid gap-0.5">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {[contact.role, contact.phone].filter(Boolean).join(" — ") || "No role or phone"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(contact.id)}
                    >
                      <Pencil aria-hidden className="size-4" />
                      Edit
                    </Button>
                    <MoveContactButtons
                      weddingId={weddingId}
                      contactId={contact.id}
                      isFirst={index === 0}
                      isLast={index === contacts.length - 1}
                    />
                    <DeleteContactButton weddingId={weddingId} contactId={contact.id} />
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

function ContactForm({
  action,
  submitLabel,
  heading,
  defaults,
  onDone,
  compact,
}: {
  action: (state: ContactActionState, values: ContactValues) => Promise<ContactActionState>;
  submitLabel: string;
  heading: string;
  defaults: ContactValues;
  onDone?: () => void;
  compact?: boolean;
}) {
  const [state, formAction, isActionPending] = useActionState<ContactActionState, ContactValues>(
    action,
    { status: "idle" },
  );
  const [, startTransition] = useTransition();

  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaults,
  });

  const isPending = isActionPending || form.formState.isSubmitting;
  const errors = form.formState.errors;

  useEffect(() => {
    if (state.status !== "error" || !state.errors) return;
    for (const [name, message] of Object.entries(state.errors)) {
      form.setError(name as keyof ContactValues, { type: "server", message });
    }
  }, [state, form]);

  useEffect(() => {
    if (state.status === "success") onDone?.();
  }, [state, onDone]);

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          await formAction(values);
        });
      })}
      noValidate
      className="grid gap-4"
    >
      {heading ? <h2 className="text-sm font-semibold">{heading}</h2> : null}

      <div className={compact ? "flex flex-wrap items-start gap-2" : "grid gap-4"}>
        <div className="min-w-40 flex-1">
          <Field
            label="Name"
            name="name"
            error={errors.name?.message}
            fieldProps={form.register("name")}
          />
        </div>
        <div className="min-w-36 flex-1">
          <Field
            label="Role"
            name="role"
            placeholder="Father of Bride"
            error={errors.role?.message}
            fieldProps={form.register("role")}
          />
        </div>
        <div className="min-w-36 flex-1">
          <Field
            label="Phone"
            name="phone"
            type="tel"
            error={errors.phone?.message}
            fieldProps={form.register("phone")}
          />
        </div>
        <div className="flex items-center gap-1 pt-6">
          <Button type="submit" size={compact ? "sm" : "default"} disabled={isPending}>
            {isPending ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Check aria-hidden className="size-4" />
            )}
            {submitLabel}
          </Button>
          {onDone ? (
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function MoveContactButtons({
  weddingId,
  contactId,
  isFirst,
  isLast,
}: {
  weddingId: string;
  contactId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { isPending, run } = useAction();

  return (
    <MoveButtons
      isFirst={isFirst}
      isLast={isLast}
      disabled={isPending}
      onMove={(direction) => run(() => moveContactAction(weddingId, contactId, direction))}
    />
  );
}

function DeleteContactButton({ weddingId, contactId }: { weddingId: string; contactId: string }) {
  const { isPending, run } = useAction();

  return (
    <DeleteButton
      disabled={isPending}
      label="Delete contact"
      onDelete={() => run(() => deleteContactAction(weddingId, contactId), { success: "Contact deleted." })}
    />
  );
}
