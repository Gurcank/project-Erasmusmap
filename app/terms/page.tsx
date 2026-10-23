import { localizedMetadata } from "@/lib/page-meta";
import { notFound } from "next/navigation";
import LegalPage from "@/components/ui/LegalPage";
import { legalPagesAvailable } from "@/lib/legal/config";

export const generateMetadata = () =>
  localizedMetadata((t) => ({ title: t.termsTitle }));

export default function TermsPage() {
  // Withheld while the operator's details are placeholders; see legalPagesAvailable.
  if (!legalPagesAvailable()) notFound();
  return <LegalPage kind="terms" />;
}
