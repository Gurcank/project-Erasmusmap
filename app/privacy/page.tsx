import type { Metadata } from "next";
import { cookies } from "next/headers";
import LegalPage from "@/components/ui/LegalPage";
import { CONSENT_COOKIE, parseConsent } from "@/lib/consent";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
};

export default async function PrivacyPage() {
  const consent = parseConsent((await cookies()).get(CONSENT_COOKIE)?.value);
  return <LegalPage kind="privacy" consent={consent} />;
}
