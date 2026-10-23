"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useT } from "@/hooks/useT";
import GlassButton from "@/components/ui/GlassButton";
import AvatarPicker from "@/components/ui/AvatarPicker";
import UserAvatar from "@/components/ui/UserAvatar";
import { resolveAvatarKey } from "@/lib/avatars";

type Props = {
  avatar: string | null;
  /** The user's id, which the default avatar is derived from. */
  seed: string;
  /** Display name, announced as the dialog's name. */
  label: string;
  /** Own profile gets the picker. */
  isOwn: boolean;
  onClose: () => void;
};

/**
 * The enlarged avatar. Opened by clicking it; on the owner's profile it also
 * carries the picker for choosing another.
 */
export default function AvatarModal({
  avatar,
  seed,
  label,
  isOwn,
  onClose,
}: Props) {
  const t = useT();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-sm rounded-panel glass border border-border bg-surface p-6 shadow-popover"
      >
        <GlassButton
          ref={closeRef}
          onClick={onClose}
          aria-label={t.closeDialog}
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3"
        >
          <X size={18} aria-hidden="true" />
        </GlassButton>

        <div className="flex flex-col items-center gap-5 pt-2">
          <UserAvatar avatar={avatar} seed={seed} size={224} />

          {isOwn && <AvatarPicker current={resolveAvatarKey(avatar, seed)} />}
        </div>
      </div>
    </div>
  );
}
