"use client";

import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared list chrome for the four wedding-scoped sections.
 *
 * Every section is the same shape — an ordered list where each row can be moved,
 * edited and deleted — so the controls live here rather than being copied four
 * times. Only the row body and the form differ between sections.
 */

export type ActionResult = { ok: boolean; message?: string };

/**
 * Runs a server action behind a pending state and surfaces the outcome as a
 * toast. Errors from the action are expected outcomes here (a 404, the
 * two-image cap), not crashes, so they are reported rather than thrown.
 */
export function useAction() {
  const [isPending, startTransition] = useTransition();

  function run(
    action: () => Promise<ActionResult | void>,
    options: { success?: string; pending?: string } = {},
  ) {
    startTransition(async () => {
      if (options.pending) toast.loading(options.pending);

      try {
        const result = await action();
        toast.dismiss();

        if (result && result.ok === false) {
          toast.error(result.message || "That did not work.");
          return;
        }

        if (options.success) toast.success(options.success);
      } catch (error) {
        toast.dismiss();
        toast.error(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  }

  return { isPending, run };
}

export function MoveButtons({
  onMove,
  isFirst,
  isLast,
  disabled,
}: {
  onMove: (direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Move up"
        disabled={disabled || isFirst}
        onClick={() => onMove("up")}
      >
        <ArrowUp aria-hidden />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Move down"
        disabled={disabled || isLast}
        onClick={() => onMove("down")}
      >
        <ArrowDown aria-hidden />
      </Button>
    </div>
  );
}

/**
 * Two-step delete. A single click would destroy a row — and in the gallery's
 * case, a Cloudinary asset — with no way back, and these lists are short enough
 * that the extra click costs nothing.
 */
export function DeleteButton({
  onDelete,
  disabled,
  label = "Delete",
}: {
  onDelete: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setConfirming(false);
            onDelete();
          }}
        >
          Confirm
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      disabled={disabled}
      onClick={() => setConfirming(true)}
    >
      <Trash2 aria-hidden />
    </Button>
  );
}

export function RowCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-4 rounded-lg border p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </li>
  );
}

export function Pending({ show }: { show: boolean }) {
  if (!show) return null;
  return <Loader2 aria-hidden className="text-muted-foreground size-4 animate-spin" />;
}

export function EmptyList({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
      {children}
    </p>
  );
}
