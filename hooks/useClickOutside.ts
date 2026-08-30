"use client";

import { useEffect, type RefObject } from "react";

type Target = RefObject<HTMLElement | null>;

/**
 * Dismisses a floating surface: calls `onDismiss` on a pointer press outside
 * both elements, or on Escape. Listeners are only attached while `enabled`, so
 * a closed popover costs nothing.
 *
 * `panel` exists for a popover rendered through a portal: it is no longer
 * inside the trigger, so a press on it would otherwise read as a press outside.
 * Ref objects are stable across renders, which is what lets them be deps here.
 */
export function useClickOutside(
  trigger: Target,
  onDismiss: () => void,
  enabled = true,
  panel?: Target,
) {
  useEffect(() => {
    if (!enabled) return;

    const isInside = (node: Node) =>
      Boolean(trigger.current?.contains(node)) ||
      Boolean(panel?.current?.contains(node));

    const onPointerDown = (event: PointerEvent) => {
      if (!isInside(event.target as Node)) onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [trigger, panel, onDismiss, enabled]);
}
