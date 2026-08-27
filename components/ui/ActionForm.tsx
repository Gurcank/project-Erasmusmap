"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";

type Props = {
  action: (
    previousState: ActionResult | null,
    formData: FormData,
  ) => Promise<ActionResult>;
  /** Rendered inside the form — inputs and the submit button. */
  children: ReactNode;
  /** Shown in a window.confirm() before the request goes out. */
  confirmMessage?: string;
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
  className,
  errorClassName = "mt-1 text-xs text-danger-700 dark:text-danger-400",
}: Props) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
      {state && !state.ok && <p className={errorClassName}>{state.error}</p>}
    </form>
  );
}
