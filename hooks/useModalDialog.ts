"use client";

import { useEffect, useRef } from "react";

/**
 * The classes that turn a `<dialog>` into the full-screen scrim the modals
 * draw their panel on. The browser's own `::backdrop` carries the dim and the
 * blur, and the dialog itself is the centring frame, so a click on the empty
 * area lands on the dialog and a click on the panel (which stops it) does not.
 */
export const MODAL_BACKDROP_CLASSES =
  "m-0 h-full max-h-none w-full max-w-none items-center justify-center bg-transparent p-6 text-text open:flex backdrop:bg-ink-950/70 backdrop:backdrop-blur-sm";

/**
 * Opens the `<dialog>` it is attached to as a modal, for as long as it is
 * mounted.
 *
 * `showModal()` is what makes it a real modal: the rest of the page becomes
 * inert, Tab stays inside, and the dialog sits in the top layer above any
 * stacking context. Escape arrives as a `cancel` event, which is turned into
 * `onClose` so the parent decides, and the default (closing without unmounting)
 * is prevented. Focus goes back to whatever had it before, and the page does not
 * scroll behind the dialog.
 */
export function useModalDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");

    const onCancel = (event: Event) => {
      event.preventDefault();
      onCloseRef.current();
    };
    dialog.addEventListener("cancel", onCancel);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      dialog.removeEventListener("cancel", onCancel);
      document.body.style.overflow = overflow;
      if (dialog.open) dialog.close();
      previouslyFocused?.focus?.();
    };
  }, []);

  return ref;
}
