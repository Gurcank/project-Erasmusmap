"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import GlassButton from "@/components/ui/GlassButton";

type Props = Omit<ComponentProps<typeof GlassButton>, "type"> & {
  /** Replaces the label while submitting. Omit to show only the spinner. */
  pendingText?: ReactNode;
};

export default function SubmitButton({
  pendingText,
  children,
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <GlassButton type="submit" disabled={pending || disabled} {...props}>
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
    </GlassButton>
  );
}
