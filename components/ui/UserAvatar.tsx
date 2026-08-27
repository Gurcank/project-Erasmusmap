import Image from "next/image";

type Props = {
  src: string | null;
  /** Display name or username — only its first letter is used as fallback. */
  label: string;
  /** Rendered size in pixels. */
  size: number;
  className?: string;
};

/**
 * One avatar rendering for the whole app. Before this, the image-or-initial
 * pattern was duplicated in four components with four different fallback
 * styles.
 */
export default function UserAvatar({
  src,
  label,
  size,
  className = "",
}: Props) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        // Avatars uploaded before the Storage migration are still base64 data
        // URIs, which the image optimizer cannot fetch.
        unoptimized={src.startsWith("data:")}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-raised font-semibold text-text-muted ring-1 ring-border ${className}`}
    >
      {label.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
