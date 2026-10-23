import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import LegalPage from "@/components/ui/LegalPage";
import { CONSENT_COOKIE, parseConsent } from "@/lib/consent";
import { legalPagesAvailable } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
};

export default async function PrivacyPage() {
  // Withheld while the operator's details are placeholders; see legalPagesAvailable.
  if (!legalPagesAvailable()) notFound();
  const consent = parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);
  return <LegalPage kind="privacy" consent={consent} />;
}
