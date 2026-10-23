"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useT } from "@/hooks/useT";
import GlassButton from "@/components/ui/GlassButton";
import AvatarPicker from "@/components/ui/AvatarPicker";
import UserAvatar from "@/components/ui/UserAvatar";
import { MODAL_BACKDROP_CLASSES, useModalDialog } from "@/hooks/useModalDialog";
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

  const dialogRef = useModalDialog(onClose);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onClick={onClose}
      className={MODAL_BACKDROP_CLASSES}
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
    </dialog>
  );
}
