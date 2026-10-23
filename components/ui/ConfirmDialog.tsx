"use client";

import { useEffect, useRef } from "react";
import { TriangleAlert } from "lucide-react";
import { useT } from "@/hooks/useT";
import GlassButton from "@/components/ui/GlassButton";
import { MODAL_BACKDROP_CLASSES, useModalDialog } from "@/hooks/useModalDialog";

type Props = {
  /** The question, already phrased for the action being confirmed. */
  message: string;
  /** Names the action rather than saying "OK", so the button reads on its own. */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirmation for a destructive action, replacing `window.confirm` — which the
 * browser draws in its own chrome, cannot carry the app's language when the
 * interface is not in the browser's, and gives every action the same "OK".
 *
 * Focus opens on Cancel: the dialog only appears in front of actions that
 * cannot be undone, so the safe answer is the one under the return key. The
 * rest of the modal behaviour (focus trap, Escape, returning focus) comes from
 * the native <dialog>, see useModalDialog.
 */
export default function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  const t = useT();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalDialog(onCancel);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={message}
      onClick={onCancel}
      className={MODAL_BACKDROP_CLASSES}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="glass glass-edge w-full max-w-sm rounded-panel border border-border bg-surface p-6 shadow-popover"
      >
        <div className="flex gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-600/12 text-danger-700 dark:text-danger-400"
          >
            <TriangleAlert size={17} />
          </span>
          <p className="pt-1.5 text-sm leading-relaxed text-text">{message}</p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <GlassButton ref={cancelRef} onClick={onCancel} variant="ghost">
            {t.cancel}
          </GlassButton>
          <GlassButton onClick={onConfirm} variant="danger">
            {confirmLabel}
          </GlassButton>
        </div>
      </div>
    </dialog>
  );
}
