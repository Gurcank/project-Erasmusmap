"use client";

import { useEffect } from "react";
import Map from "@/components/map/Map";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Map isStatic />
      </div>

      <div className="absolute inset-0 bg-black/60 -z-10" />

      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md text-center backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Bir şeyler ters gitti
          </h1>
          <p className="text-white/70 mb-8">
            {error.message || "Beklenmeyen bir hata oluştu."}
          </p>
          <button
            onClick={reset}
            className="py-3 px-6 bg-black/80 text-white font-semibold rounded-xl hover:bg-black transition"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    </div>
  );
}
