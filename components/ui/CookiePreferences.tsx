"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/hooks/useT";
import GlassButton from "@/components/ui/GlassButton";
import { storeConsent, type Consent } from "@/lib/consent";

/**
 * Where a choice made in the banner can be seen and changed afterwards. A
 * choice is only as free as it is easy to take back.
 */
export default function CookiePreferences({ consent }: { consent: Consent }) {
  const t = useT();
  const router = useRouter();

  const choose = (granted: boolean) => {
    storeConsent(granted);
    router.refresh();
  };

  const status =
    consent === "granted"
      ? t.cookieStatusGranted
      : consent === "denied"
        ? t.cookieStatusDenied
        : t.cookieStatusUnset;

  return (
    <section
      aria-labelledby="cookie-preferences-heading"
      className="space-y-3 border-t border-border pt-6"
    >
      <h2
        id="cookie-preferences-heading"
        className="font-display text-base font-semibold text-text"
      >
        {t.cookiePrefsTitle}
      </h2>
      <p role="status" className="text-text-muted">
        {status}
      </p>
      <div className="flex flex-wrap gap-2">
        <GlassButton
          onClick={() => choose(false)}
          aria-pressed={consent === "denied"}
          size="sm"
        >
          {t.cookieReject}
        </GlassButton>
        <GlassButton
          onClick={() => choose(true)}
          aria-pressed={consent === "granted"}
          size="sm"
        >
          {t.cookieAccept}
        </GlassButton>
      </div>
    </section>
  );
}
