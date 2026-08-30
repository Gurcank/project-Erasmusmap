"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";
import GlassButton from "@/components/ui/GlassButton";

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
      <GlassButton onClick={reset} variant="primary" size="lg" fullWidth>
        <RotateCcw size={16} aria-hidden="true" />
        Tekrar dene
      </GlassButton>
      {error.digest && (
        <p className="mt-4 text-center font-mono text-xs text-ink-400">
          {error.digest}
        </p>
      )}
    </AuthShell>
  );
}
