"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";
import GlassButton from "@/components/ui/GlassButton";

const FIELD_CLASS =
  "w-full rounded-control border border-ink-50/20 bg-ink-50/10 px-4 py-3 text-ink-50 transition-colors placeholder:text-ink-300 focus-visible:border-accent-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400";

export default function RegisterClient() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch = password === confirmPassword;

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!passwordsMatch) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setIsSubmitting(false);
        return;
      }

      router.push("/login");
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar dene.");
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell title="Kayıt Ol">
      <form onSubmit={handleRegister} className="flex flex-col gap-3">
        <input
          type="text"
          aria-label="Ad Soyad"
          placeholder="Ad Soyad"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={FIELD_CLASS}
          required
        />
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
          placeholder="Şifre (en az 8 karakter)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={FIELD_CLASS}
          required
        />
        <input
          type="password"
          aria-label="Şifre Tekrar"
          placeholder="Şifre tekrar"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
          className={FIELD_CLASS}
          required
        />

        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="text-sm text-accent-300">Şifreler eşleşmiyor</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-400">
            {error}
          </p>
        )}

        <GlassButton
          type="submit"
          disabled={!passwordsMatch || isSubmitting}
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
          {isSubmitting ? "Kaydediliyor…" : "Kayıt ol"}
        </GlassButton>

        <p className="mt-2 text-center text-sm text-ink-300">
          Zaten hesabın var mı?{" "}
          <Link
            href="/login"
            className="font-semibold text-accent-400 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
          >
            Giriş yap
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
