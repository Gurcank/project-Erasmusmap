import Image from "next/image";

/**
 * Fixed satellite view of Europe behind every page (see app/layout.tsx). A
 * static image rather than a live Mapbox instance so it costs nothing per
 * route.
 *
 * The scrim is the same in both themes. It used to follow --canvas, which meant
 * the light theme washed the continent out with white; the image is the ground
 * the whole app sits on, and it should not change colour when the panels do.
 * Everything drawn straight onto it uses --on-backdrop (see globals.css).
 */
export default function GlobeBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <Image
        src="/globe-backdrop.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="scale-105 object-cover blur-[1.5px]"
      />
      {/* Flat scrim sets the floor for contrast; the radial vignette then fades
          the edges to the same near-black so the chrome sits on a calm ground
          while the middle stays open. */}
      <div className="absolute inset-0 bg-ink-950/17" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_45%,transparent_0%,var(--color-ink-950)_100%)]" />
      {/* Mapbox terms require attribution wherever their imagery is shown. */}
      <p className="absolute right-2 bottom-1 text-[0.6rem] tracking-wide text-ink-50/45">
        © Mapbox © Maxar
      </p>
    </div>
  );
}
