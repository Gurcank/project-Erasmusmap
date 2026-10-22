import AvatarFigure from "@/components/ui/AvatarFigure";
import { resolveAvatarKey } from "@/lib/avatars";

type Props = {
  /** The stored avatar key; null until the person picks one. */
  avatar: string | null;
  /**
   * What the default avatar is derived from: the user's id. It has to be the
   * same everywhere the person appears, or they would change avatar from page
   * to page.
   */
  seed: string;
  /** Rendered size in pixels. */
  size: number;
  className?: string;
};

/**
 * One avatar rendering for the whole app. Decorative: the name next to it is
 * what identifies the person.
 */
export default function UserAvatar({
  avatar,
  seed,
  size,
  className = "",
}: Props) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`flex shrink-0 overflow-hidden rounded-full bg-surface-raised text-text ring-1 ring-border ${className}`}
    >
      <AvatarFigure avatarKey={resolveAvatarKey(avatar, seed)} />
    </span>
  );
}
