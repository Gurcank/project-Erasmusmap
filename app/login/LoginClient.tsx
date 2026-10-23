"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";
import GlassButton from "@/components/ui/GlassButton";
import { useT } from "@/hooks/useT";

export default function LoginClient({
  showLegalNotice,
}: {
  /** False while the policy and the terms are not published: nothing to link to. */
  showLegalNotice: boolean;
}) {
  const t = useT();
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState("");
  // Google answers with a full-page redirect, which can take a moment on a slow
  // connection; without this the button looks like it did nothing.
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (searchParams.get("error") === "AccessDenied") {
      setError("Hesabınız askıya alınmış. Giriş yapamazsınız.");
    }
  }, [searchParams]);

  // The shell stays up while the session is checked, with the button held, so
  // the page does not flash blank and then jump.
  const isBusy = isRedirecting || status === "loading";

  return (
    <AuthShell
      title="Giriş Yap"
      description="ErasmusMap'e Google hesabınla giriş yap."
    >
      <GlassButton
        onClick={() => {
          setIsRedirecting(true);
          signIn("google", { callbackUrl: "/" });
        }}
        disabled={isBusy}
        variant="contrast"
        size="lg"
        fullWidth
      >
        {isRedirecting && (
          <Loader2
            size={16}
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        )}
        {isRedirecting ? "Yönlendiriliyor…" : "Google ile devam et"}
      </GlassButton>

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-danger-400">
          {error}
        </p>
      )}

      <p className="mt-6 text-center text-xs leading-relaxed text-ink-300">
        Hesabın yoksa ilk girişinde otomatik olarak oluşturulur.
      </p>

      {showLegalNotice && (
        <p className="mt-3 text-center text-xs leading-relaxed text-ink-300">
          {t.loginLegalNotice.split(/({terms}|{privacy})/).map((part, index) =>
            part === "{terms}" || part === "{privacy}" ? (
              <Link
                key={index}
                href={part === "{terms}" ? "/terms" : "/privacy"}
                className="text-ink-50 underline underline-offset-2 hover:text-accent-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {part === "{terms}" ? t.termsLinkText : t.privacyLinkText}
              </Link>
            ) : (
              part
            ),
          )}
        </p>
      )}
    </AuthShell>
  );
}
