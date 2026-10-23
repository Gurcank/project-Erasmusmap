import type { Metadata } from "next";
import { Suspense } from "react";
import { legalPagesAvailable } from "@/lib/legal/config";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Giriş Yap",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient showLegalNotice={legalPagesAvailable()} />
    </Suspense>
  );
}
