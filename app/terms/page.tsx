import type { Metadata } from "next";
import LegalPage from "@/components/ui/LegalPage";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
};

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
