"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useT } from "@/hooks/useT";
import GlassButton from "@/components/ui/GlassButton";
import AvatarUploader from "@/components/ui/AvatarUploader";

type Props = {
  image: string | null;
  /** Display name — its first letter is the fallback when there is no image. */
  label: string;
  /** Own profile gets the change / remove controls and the format note. */
  isOwn: boolean;
  onClose: () => void;
};

/**
 * The enlarged profile photo. Opened by clicking the avatar; on the owner's
 * profile it also carries the upload controls and the format note that used to
 * sit permanently under the avatar.
 */
export default function AvatarModal({ image, label, isOwn, onClose }: Props) {
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
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={label}
              className="h-56 w-56 rounded-full border border-border object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-56 w-56 items-center justify-center rounded-full bg-surface-raised text-6xl font-semibold text-text-muted ring-1 ring-border"
            >
              {label.trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}

          {isOwn && (
            <div className="flex w-full flex-col items-center gap-2">
              <AvatarUploader image={image} fallbackLabel={label} />
              <p className="text-xs text-text-subtle">{t.profilePhotoHint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
