"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Map from "@/components/map/Map";

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-z0-9_-]+$/;

export default function ChooseUsernamePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validationError = (() => {
    if (username.length < USERNAME_MIN_LENGTH) return `En az ${USERNAME_MIN_LENGTH} karakter olmalı`;
    if (username.length > USERNAME_MAX_LENGTH) return `En fazla ${USERNAME_MAX_LENGTH} karakter olmalı`;
    if (!USERNAME_PATTERN.test(username)) return "Sadece küçük harf, rakam, _ ve - kullanılabilir";
    return null;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      router.push(`/u/${username}`);
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar dene.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Map isStatic />
      </div>
      <div className="absolute inset-0 bg-black/60 -z-10" />

      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl p-8">

          <h1 className="text-3xl font-bold text-center text-white mb-2">
            Kullanıcı Adı Seç
          </h1>
          <p className="text-white/60 text-sm text-center mb-8">
            Bu isim profilinde görünecek
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 select-none">@</span>
              <input
                type="text"
                placeholder="kullanici-adi"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                maxLength={USERNAME_MAX_LENGTH}
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/60"
                required
              />
            </div>

            {username.length > 0 && validationError && (
              <p className="text-amber-300 text-sm">{validationError}</p>
            )}

            {error && (
              <p className="text-red-300 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || !!validationError || username.length === 0}
              className="py-3 bg-black/80 text-white font-semibold rounded-xl hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
