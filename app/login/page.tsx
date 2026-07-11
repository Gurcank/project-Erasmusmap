"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Map from "@/components/map/Map";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email veya şifre hatalı");
    } else {
      router.replace("/");
    }
  };

  if (status === "loading") return null;

  return (
  <div className="relative w-full h-screen overflow-hidden">

    {/* ARKA PLAN MAP */}
    <div className="absolute inset-0 -z-10">
      <Map isStatic />
    </div>

    {/* KARARTMA OVERLAY */}
    <div className="absolute inset-0 bg-black/60 -z-10" />

    {/* LOGIN CARD */}
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl p-8">

        <h1 className="text-3xl font-bold text-center text-white mb-8">
          Giriş Yap
        </h1>

        {/* GOOGLE */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full py-3 mb-6 bg-white text-gray-800 font-medium rounded-xl hover:scale-[1.02] transition-all duration-200 shadow-md"
        >
          Google ile Giriş Yap
        </button>

        <div className="relative flex items-center mb-6">
          <div className="flex-grow border-t border-white/30"></div>
          <span className="mx-4 text-white/70 text-sm">veya</span>
          <div className="flex-grow border-t border-white/30"></div>
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
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

          {error && (
            <p className="text-red-300 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="py-3 bg-black/80 text-white font-semibold rounded-xl hover:bg-black transition"
          >
            Email ile Giriş Yap
          </button>

          <p className="text-sm text-center text-white/80 mt-2">
            Hesabın yok mu?{" "}
            <Link href="/register" className="font-semibold underline">
              Kayıt Ol
            </Link>
          </p>
        </form>

      </div>
    </div>
  </div>
);
}