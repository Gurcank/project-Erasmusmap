import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "@/components/ui/LegalPage";
import { legalPagesAvailable } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
};

export default function TermsPage() {
  // Withheld while the operator's details are placeholders; see legalPagesAvailable.
  if (!legalPagesAvailable()) notFound();
  return <LegalPage kind="terms" />;
}
