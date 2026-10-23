import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "@/components/ui/LegalPage";
import { legalPagesAvailable } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
};

export default function PrivacyPage() {
  // Withheld while the operator's details are placeholders; see legalPagesAvailable.
  if (!legalPagesAvailable()) notFound();
  return <LegalPage kind="privacy" />;
}
