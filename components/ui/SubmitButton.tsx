"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  pendingText: ReactNode;
};

export default function SubmitButton({
  pendingText,
  children,
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending || disabled} {...props}>
      {pending ? pendingText : children}
    </button>
  );
}
