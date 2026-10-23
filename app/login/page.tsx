import { localizedMetadata } from "@/lib/page-meta";
import { Suspense } from "react";
import { legalPagesAvailable } from "@/lib/legal/config";
import LoginClient from "./LoginClient";

export const generateMetadata = () =>
  localizedMetadata((t) => ({
    title: t.login,
    // A form, not a page to land on; it is not in the sitemap either.
    robots: { index: false, follow: true },
  }));

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient showLegalNotice={legalPagesAvailable()} />
    </Suspense>
  );
}
