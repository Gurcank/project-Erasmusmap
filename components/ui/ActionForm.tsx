"use client";

import { useActionState, useRef, useState } from "react";
import LocalizedError from "@/components/ui/LocalizedError";
import type { ReactNode } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useT } from "@/hooks/useT";
import type { ActionResult } from "@/lib/action-result";

type Props = {
  action: (
    previousState: ActionResult | null,
    formData: FormData,
  ) => Promise<ActionResult>;
  /** Rendered inside the form — inputs and the submit button. */
  children: ReactNode;
  /** Asked in a ConfirmDialog before the request goes out. */
  confirmMessage?: string;
  /** Names the action on the dialog's confirm button. */
  confirmLabel?: string;
  className?: string;
  errorClassName?: string;
};

/**
 * Wraps a server action so its failure message is rendered next to the form.
 * Exists because these forms appear inside .map() calls, where useActionState
 * cannot be called directly.
 */
export default function ActionForm({
  action,
  children,
  confirmMessage,
  confirmLabel,
  className,
  errorClassName = "mt-1 text-xs text-danger-700 dark:text-danger-400",
}: Props) {
  const t = useT();
  const [state, formAction] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [asking, setAsking] = useState(false);
  // A ref, not state: the submit is re-dispatched synchronously below, so the
  // handler has to see the answer without waiting for a render.
  const confirmed = useRef(false);

  const confirm = () => {
    setAsking(false);
    confirmed.current = true;
    formRef.current?.requestSubmit();
    confirmed.current = false;
  };

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        className={className}
        onSubmit={(event) => {
          if (!confirmMessage || confirmed.current) return;
          event.preventDefault();
          setAsking(true);
        }}
      >
        {children}
        {state && !state.ok && (
          <p className={errorClassName}>
            <LocalizedError message={state.error} />
          </p>
        )}
      </form>

      {asking && confirmMessage && (
        <ConfirmDialog
          message={confirmMessage}
          confirmLabel={confirmLabel ?? t.confirmAction}
          onConfirm={confirm}
          onCancel={() => setAsking(false)}
        />
      )}
    </>
  );
}
