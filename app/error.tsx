"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";

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
    <AuthShell
      title="Bir şeyler ters gitti"
      description="Beklenmeyen bir hata oluştu. Tekrar denemek sorunu çözebilir."
    >
      <button
        type="button"
        onClick={reset}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-primary py-3 font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
      >
        <RotateCcw size={16} aria-hidden="true" />
        Tekrar dene
      </button>
      {error.digest && (
        <p className="mt-4 text-center font-mono text-xs text-ink-400">
          {error.digest}
        </p>
      )}
    </AuthShell>
  );
}
