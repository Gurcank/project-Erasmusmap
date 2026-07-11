"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Map from "@/components/map/Map";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push("/login");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">

      {/* 🌍 ARKA PLAN MAP */}
      <div className="absolute inset-0 -z-10">
        <Map isStatic />
      </div>

      {/* 🌌 OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80 backdrop-blur-[2px] -z-10" />

      {/* 💎 REGISTER CARD */}
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md backdrop-blur-2xl bg-white/10 border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-3xl p-10 transition-all duration-500">

          <h1 className="text-3xl font-bold text-center text-white mb-8">
            Kayıt Ol
          </h1>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Ad Soyad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/60"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/60"
              required
            />
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/60"
              required
            />

            <input
              type="password"
              placeholder="Şifre Tekrar"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/60"
              required
            />

            {error && (
              <p className="text-red-300 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={password !== confirmPassword}
              className={`py-3 font-semibold rounded-xl transition ${password === confirmPassword
                ? "bg-black/80 hover:bg-black text-white"
                : "bg-gray-500 text-gray-300 cursor-not-allowed"
                }`}
            >
              Kayıt Ol
            </button>

            <p className="text-sm text-center text-white/80 mt-2">
              Zaten hesabın var mı?{" "}
              <Link href="/login" className="font-semibold underline">
                Giriş Yap
              </Link>
            </p>

          </form>

        </div>
      </div>
    </div>
  );
}