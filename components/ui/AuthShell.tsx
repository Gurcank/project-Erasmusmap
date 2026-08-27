import type { ReactNode } from "react";
import Map from "@/components/map/Map";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * Shared frame for the pages that sit on top of the map: sign in, register,
 * username picker, 404 and the error boundary. The card stays dark in both
 * themes on purpose — it floats over satellite/map imagery, where a light
 * surface would lose contrast against bright terrain.
 */
export default function AuthShell({ title, description, children }: Props) {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Map isStatic />
      </div>
      <div className="absolute inset-0 -z-10 bg-ink-950/70" />

      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-panel border border-ink-50/15 bg-ink-950/65 p-8 shadow-popover backdrop-blur-xl">
          <h1 className="text-center font-display text-2xl font-bold text-ink-50">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-center text-sm text-ink-300">
              {description}
            </p>
          )}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
