"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";
import GlassButton from "@/components/ui/GlassButton";

// Shown when next-auth reports a failure with no message of its own.
const GENERIC_SIGN_IN_ERROR = "Email veya şifre hatalı";

const FIELD_CLASS =
  "w-full rounded-control border border-ink-50/20 bg-ink-50/10 px-4 py-3 text-ink-50 transition-colors placeholder:text-ink-300 focus-visible:border-accent-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400";

export default function LoginClient() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    if (searchParams.get("error") === "AccessDenied") {
      setError("Hesabınız askıya alınmış. Giriş yapamazsınız.");
    }
  }, [searchParams]);

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Passed through rather than replaced: every credentials failure now
        // answers with the same generic message server-side, so the only
        // distinctions that reach here — rate limited, suspended — are ones
        // the person needs to read. Overwriting them told someone who had hit
        // the login limit that their password was wrong.
        setError(result.error || GENERIC_SIGN_IN_ERROR);
        setIsSubmitting(false);
      } else {
        router.replace("/");
      }
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar dene.");
      setIsSubmitting(false);
    }
  };

  if (status === "loading") return null;

  return (
    <AuthShell title="Giriş Yap">
      <GlassButton
        onClick={() => signIn("google", { callbackUrl: "/" })}
        variant="contrast"
        size="lg"
        fullWidth
      >
        Google ile devam et
      </GlassButton>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-ink-50/20" />
        <span className="text-xs text-ink-300">veya</span>
        <span className="h-px flex-1 bg-ink-50/20" />
      </div>

      <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
        <input
          type="email"
          aria-label="Email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={FIELD_CLASS}
          required
        />
        <input
          type="password"
          aria-label="Şifre"
          placeholder="Şifre"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={FIELD_CLASS}
          required
        />

        {error && (
          <p role="alert" className="text-sm text-danger-400">
            {error}
          </p>
        )}

        <GlassButton
          type="submit"
          disabled={isSubmitting}
          variant="primary"
          size="lg"
          fullWidth
          className="mt-1"
        >
          {isSubmitting && (
            <Loader2
              size={16}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          )}
          {isSubmitting ? "Giriş yapılıyor…" : "Email ile giriş yap"}
        </GlassButton>

        <p className="mt-2 text-center text-sm text-ink-300">
          Hesabın yok mu?{" "}
          <Link
            href="/register"
            className="font-semibold text-accent-400 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
          >
            Kayıt ol
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
