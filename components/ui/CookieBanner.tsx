"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/hooks/useT";
import GlassButton from "@/components/ui/GlassButton";
import { storeConsent } from "@/lib/consent";

/**
 * Asks once about the optional statistics. Accept and Refuse are the same
 * button in the same size, so neither is nudged. It sits at the bottom, out of
 * the way of the navbar, and is a region rather than a dialog: it does not take
 * focus or block the page, and the site works fully before it is answered.
 */
export default function CookieBanner() {
  const t = useT();
  const router = useRouter();

  const choose = (granted: boolean) => {
    storeConsent(granted);
    // The layout decides whether to include the statistics script, on the server,
    // so it has to render again to see the choice.
    router.refresh();
  };

  return (
    <section
      aria-label={t.cookieBannerLabel}
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl rounded-panel glass border border-border bg-surface p-4 shadow-popover sm:bottom-4 sm:p-5"
    >
      <p className="text-sm leading-relaxed text-text">
        {t.cookieBannerText}{" "}
        <Link
          href="/privacy"
          className="text-accent-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t.privacyTitle}
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <GlassButton onClick={() => choose(false)} size="sm">
          {t.cookieReject}
        </GlassButton>
        <GlassButton onClick={() => choose(true)} size="sm">
          {t.cookieAccept}
        </GlassButton>
      </div>
    </section>
  );
}
