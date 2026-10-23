"use client";

import { useRef, useState, useTransition } from "react";
import LocalizedError from "@/components/ui/LocalizedError";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AvatarFigure from "@/components/ui/AvatarFigure";
import { useLang } from "@/hooks/useLang";
import { useT } from "@/hooks/useT";
import { setAvatar } from "@/lib/profile-actions";
import { AVATAR_KEYS, type AvatarKey } from "@/lib/avatars";
import { avatarNames } from "@/lib/translations/avatars";

const ARROW_STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * The avatar choices as one radio group: a single tab stop, arrow keys to move,
 * and moving selects, as a native radio group does. A choice is saved as soon as
 * it is made, so there is no separate button to forget to press.
 */
export default function AvatarPicker({ current }: { current: AvatarKey }) {
  const t = useT();
  const names = avatarNames[useLang()];
  const router = useRouter();
  const { update } = useSession();
  const [selected, setSelected] = useState(current);
  const [error, setError] = useState("");
  const [isSaving, startSaving] = useTransition();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const choose = (key: AvatarKey) => {
    if (key === selected) return;
    const previous = selected;
    setSelected(key);
    setError("");

    startSaving(async () => {
      const formData = new FormData();
      formData.set("avatar", key);
      const result = await setAvatar(null, formData);
      if (!result.ok) {
        setSelected(previous);
        setError(result.error);
        return;
      }
      // The session carries the avatar for the navbar; without this it would
      // show the old one until the token is next refreshed.
      await update();
      router.refresh();
    });
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = ARROW_STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + AVATAR_KEYS.length) % AVATAR_KEYS.length;
    buttons.current[next]?.focus();
    choose(AVATAR_KEYS[next]);
  };

  return (
    <div className="w-full space-y-2">
      <p id="avatar-picker-label" className="text-sm font-medium text-text">
        {t.chooseAvatar}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="avatar-picker-label"
        aria-busy={isSaving}
        className="grid grid-cols-4 gap-2 sm:grid-cols-6"
      >
        {AVATAR_KEYS.map((key, index) => {
          const isSelected = key === selected;
          return (
            <button
              key={key}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={names[key]}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => choose(key)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`aspect-square w-full rounded-full bg-surface-raised text-text transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                isSelected
                  ? "ring-2 ring-primary"
                  : "ring-1 ring-border hover:ring-border-strong"
              }`}
            >
              <AvatarFigure avatarKey={key} />
            </button>
          );
        })}
      </div>
      {error && (
        <p
          role="alert"
          className="text-xs text-danger-700 dark:text-danger-400"
        >
          <LocalizedError message={error} />
        </p>
      )}
    </div>
  );
}
