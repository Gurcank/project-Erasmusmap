"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  /** Replaces the label while submitting. Omit to show only the spinner. */
  pendingText?: ReactNode;
};

export default function SubmitButton({
  pendingText,
  children,
  disabled,
  className = "",
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {pending ? (
        <>
          <Loader2
            size={15}
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
