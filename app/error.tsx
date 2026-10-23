"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";
import { useT } from "@/hooks/useT";
import GlassButton from "@/components/ui/GlassButton";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AuthShell title={t.errorTitle} description={t.errorDescription}>
      <GlassButton onClick={reset} variant="primary" size="lg" fullWidth>
        <RotateCcw size={16} aria-hidden="true" />
        {t.errorRetry}
      </GlassButton>
      {error.digest && (
        <p className="mt-4 text-center font-mono text-xs text-ink-400">
          {error.digest}
        </p>
      )}
    </AuthShell>
  );
}
