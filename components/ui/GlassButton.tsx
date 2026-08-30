import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  Ref,
} from "react";

/**
 * `visited` and `wish` are the two list states on a city, not decoration: they
 * carry the same hues as the map and the profile, and always ship with an icon.
 */
export type GlassButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "visited"
  | "wish"
  | "contrast";

export type GlassButtonSize = "sm" | "md" | "lg" | "icon" | "iconSm";

// Every surface but `primary` is translucent, so the button reads as cut from
// the same glass as the panel it sits on. Primary stays solid — one opaque
// element per view is what makes it read as the primary action.
const VARIANTS: Record<GlassButtonVariant, string> = {
  primary:
    "border-transparent bg-primary text-on-primary hover:bg-primary-hover",
  secondary:
    "border-border-strong bg-surface-raised/70 text-text hover:bg-surface-raised",
  ghost:
    "border-transparent text-text-muted hover:bg-surface-raised/70 hover:text-text",
  danger:
    "border-danger-600/45 bg-danger-600/12 text-danger-700 hover:bg-danger-600/20 dark:border-danger-500/45 dark:text-danger-400",
  visited:
    "border-visited-600 bg-visited-600/12 text-visited-700 hover:bg-visited-600/20 dark:border-visited-500 dark:text-visited-400",
  wish: "border-wish-600 bg-wish-600/12 text-wish-700 hover:bg-wish-600/20 dark:border-wish-500 dark:text-wish-400",
  // For the auth card, which stays dark in both themes.
  contrast: "border-transparent bg-ink-50 text-ink-950 hover:bg-ink-200",
};

const SIZES: Record<GlassButtonSize, string> = {
  sm: "h-8 px-3 text-xs font-semibold",
  md: "h-10 px-4 text-sm font-semibold",
  lg: "h-11 px-5 text-sm font-semibold",
  icon: "h-10 w-10",
  iconSm: "h-8 w-8",
};

const BASE =
  "glass glass-edge glass-sweep inline-flex cursor-pointer items-center justify-center rounded-full border whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-55";

function classesFor(
  variant: GlassButtonVariant,
  size: GlassButtonSize,
  fullWidth: boolean,
  className: string,
) {
  return [
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * The label lives in its own stacking context so the hover sweep passes behind
 * it rather than washing over the text.
 */
function Label({ children }: { children: ReactNode }) {
  return (
    <span className="relative z-10 inline-flex items-center justify-center gap-2">
      {children}
    </span>
  );
}

type SharedProps = {
  variant?: GlassButtonVariant;
  size?: GlassButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
};

type ButtonProps = SharedProps & {
  /** Plain prop rather than forwardRef — React 19 passes it straight through. */
  ref?: Ref<HTMLButtonElement>;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

export default function GlassButton({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classesFor(variant, size, fullWidth, className)}
      {...props}
    >
      <Label>{children}</Label>
    </button>
  );
}

type LinkProps = SharedProps & { href: string } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "children" | "className" | "href"
  >;

/** Same surface for the links that act as buttons (sign in, back to map). */
export function GlassLink({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  href,
  ...props
}: LinkProps) {
  return (
    <Link
      href={href}
      className={classesFor(variant, size, fullWidth, className)}
      {...props}
    >
      <Label>{children}</Label>
    </Link>
  );
}
