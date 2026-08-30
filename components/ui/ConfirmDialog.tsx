"use client";

import { useEffect, useRef } from "react";
import { TriangleAlert } from "lucide-react";
import { useT } from "@/hooks/useT";
import GlassButton from "@/components/ui/GlassButton";

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
 * cannot be undone, so the safe answer is the one under the return key. Follows
 * AvatarModal for the rest of the modal behaviour, including its lack of a
 * focus trap.
 */
export default function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props) {
  const t = useT();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={message}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-6 backdrop-blur-sm"
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
    </div>
  );
}
