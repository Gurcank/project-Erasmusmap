"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";
import GlassButton from "@/components/ui/GlassButton";
import { USERNAME_MAX_LENGTH, getUsernameError } from "@/lib/username";

export default function ChooseUsernameClient() {
  const router = useRouter();
  const { update } = useSession();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validationError = username ? getUsernameError(username) : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validationError) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Bir hata oluştu");
        return;
      }

      // Refresh the token so the navbar stops treating this account as
      // username-less and links to the real profile.
      await update();
      router.push(`/u/${username}`);
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar dene.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Kullanıcı adı seç"
      description="Bu isim profilinde ve yorumlarında görünecek."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          aria-label="Kullanıcı adı"
          placeholder="kullanici-adi"
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
          maxLength={USERNAME_MAX_LENGTH}
          aria-invalid={Boolean(validationError)}
          className="w-full rounded-control border border-ink-50/20 bg-ink-50/10 px-4 py-3 text-ink-50 transition-colors placeholder:text-ink-300 focus-visible:border-accent-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-400"
          required
        />

        {username.length > 0 && validationError && (
          <p className="text-sm text-accent-300">{validationError}</p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-400">
            {error}
          </p>
        )}

        <GlassButton
          type="submit"
          disabled={isLoading || Boolean(validationError) || !username}
          variant="primary"
          size="lg"
          fullWidth
          className="mt-1"
        >
          {isLoading && (
            <Loader2
              size={16}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          )}
          {isLoading ? "Kaydediliyor…" : "Kaydet"}
        </GlassButton>
      </form>
    </AuthShell>
  );
}
